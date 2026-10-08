#!/usr/bin/env bash
# scoped-check.sh [--local] [--print] <base_ref>
# scoped-check.sh typecheck <modul>...
#
# Lint, testovi i provera tipova samo za module koje diff u odnosu na
# <base_ref> dira, zajedno sa onim od cega oni zavise — NE i za module koji
# zavise od njih.
#
# Zasto: kad modules/domain promeni postojeci tip, infrastructure/ui prestaju
# da prolaze tsc dok ih child tiketi ne prilagode, a ti tiketi se otvaraju tek
# posle merge-a domain PR-a u epic granu. Pun tsc na domain PR-u zato ne moze
# da prodje (isti problem kao BE #167). Zavisni moduli dolaze na red u svom
# child tiketu, a zbirni PR ka main proverava sve.
#
# Isto mapiranje koriste pr-check.yml i lokalni gate na Pi-ju
# (reservation-agents/scripts/lib/local_tests.sh), da se ne bi razisli.
#
#   --local  bez vite build-a (tsc hvata greske tipova, bundle na Pi-ju samo
#            trosi vreme)
#   --print  samo ispisi komandu; prazan izlaz = nema sta da se proverava
#   typecheck <modul>...  ceo tsc, ali pada samo na greskama u fajlovima tih
#            modula. `tsc -b modules/<m>` nije dovoljan: tsconfig modula
#            iskljucuje testove, a root tsconfig ih proverava.
set -euo pipefail

# Od cega zavisi koji modul (references u modules/*/tsconfig.json).
declare -A DEPS=(
  [domain]=""
  [application]="domain"
  [infrastructure]="domain application"
)

typecheck() {
  local out rc pattern own other global
  set +e
  out=$(yarn -s tsc -b --pretty false 2>&1)
  rc=$?
  set -e
  if [ "$rc" -eq 0 ]; then
    echo "tsc: bez gresaka"
    return 0
  fi

  pattern="^modules/($(echo "$*" | tr ' ' '|'))/"
  # Greska bez putanje fajla (npr. pokvaren tsconfig) obara uvek.
  global=$(echo "$out" | grep -E '^error TS' || true)
  own=$(echo "$out" | grep -E '^[^ ].*\([0-9]+,[0-9]+\): error TS' | grep -E "$pattern" || true)
  other=$(echo "$out" | grep -E '^[^ ].*\([0-9]+,[0-9]+\): error TS' | grep -vE "$pattern" || true)

  if [ -n "$other" ]; then
    echo "tsc: $(echo "$other" | wc -l) gresaka van proveravanih modula ($*) se ne racuna —"
    echo "prilagodjavaju ih child tiketi, a zbirni PR ka main proverava sve:"
    # `|| true`: head zatvara pipe ranije, a pod pipefail bi taj SIGPIPE
    # oborio proveru bas kad zavisnih gresaka ima mnogo.
    { echo "$other" | sed 's/^/  /' | head -40; } || true
    echo
  fi
  if [ -n "$global" ] || [ -n "$own" ]; then
    echo "tsc: greske u proveravanim modulima ($*):"
    [ -n "$global" ] && echo "$global"
    # Sa redovima nastavka (uvuceni), da poruka greske ostane cela.
    echo "$out" | awk -v pat="$pattern" '
      /^[^ ]/ { keep = ($0 ~ pat) }
      keep'
    return 1
  fi
  echo "tsc: proveravani moduli ($*) su bez gresaka"
  return 0
}

if [ "${1:-}" = "typecheck" ]; then
  shift
  typecheck "$@"
  exit $?
fi

local_mode=false
print_only=false
while [ $# -gt 0 ]; do
  case "$1" in
    --local) local_mode=true ;;
    --print) print_only=true ;;
    -*) echo "nepoznata opcija: $1" >&2; exit 2 ;;
    *) break ;;
  esac
  shift
done
base="${1:?upotreba: scoped-check.sh [--local] [--print] <base_ref>}"

install="yarn install --frozen-lockfile --prefer-offline --non-interactive"
e2e_cmd="(cd e2e && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 $install && yarn typecheck && yarn test:list > /dev/null)"
full_cmd="$install && yarn lint && yarn test --run && yarn build && $e2e_cmd"
[ "$local_mode" = true ] && full_cmd="$install && yarn lint && yarn test --run && yarn tsc -b && $e2e_cmd"

changed_files() {
  # Radno stanje prema base-u (u CI-ju je to merge commit PR-a, lokalno i
  # necommit-ovan rad agenta) + novi fajlovi koje git jos ne prati.
  git diff --name-only "$base"
  git ls-files --others --exclude-standard
}

command_for_diff() {
  local file m dep full=false e2e=false
  local -A mods=() allowed=()

  # PR ka main je zavrsna provera pre deploy-a: uvek sve.
  if [ "${base#origin/}" = "main" ]; then
    echo "$full_cmd"
    return
  fi

  while IFS= read -r file; do
    [ -z "$file" ] && continue
    case "$file" in
      *.md|docs/*|logs/*|skills/*|.claude/*|LICENSE|.gitignore|.env.example|.prettierrc|Dockerfile|.dockerignore|nginx.conf|compose*.yml|compose*.yaml) ;;
      e2e/*) e2e=true ;;
      modules/domain/src/*|modules/application/src/*|modules/infrastructure/src/*)
        m="${file#modules/}"
        mods["${m%%/*}"]=1
        ;;
      # ui i src/ ulaze u bundle, pa za njih ide sve, sa vite build-om.
      # Isto za root konfiguraciju (package.json, yarn.lock, tsconfig*,
      # vite/vitest/eslint config), .github/, scripts/ i sve nepoznato.
      *) full=true ;;
    esac
  done < <(changed_files | sort -u)

  if [ "$full" = true ]; then
    echo "$full_cmd"
    return
  fi

  local parts=()
  if [ "${#mods[@]}" -gt 0 ]; then
    for m in "${!mods[@]}"; do
      allowed[$m]=1
      for dep in ${DEPS[$m]}; do allowed[$dep]=1; done
    done
    local test_paths allowed_list
    test_paths=$(printf 'modules/%s/ ' "${!mods[@]}" | tr ' ' '\n' | sort | tr '\n' ' ' | sed 's/ $//')
    allowed_list=$(printf '%s\n' "${!allowed[@]}" | sort | tr '\n' ' ' | sed 's/ $//')
    # Lint ostaje ceo: tseslint.configs.recommended ne cita tipove, pa izmena
    # u jednom modulu ne obara lint u drugom.
    parts+=("$install && yarn lint && yarn test --run --passWithNoTests $test_paths && scripts/ci/scoped-check.sh typecheck $allowed_list")
  fi
  [ "$e2e" = true ] && parts+=("$e2e_cmd")

  [ "${#parts[@]}" -eq 0 ] && return
  local out="" p
  for p in "${parts[@]}"; do out="${out:+$out && }$p"; done
  echo "$out"
}

cmd=$(command_for_diff)

if [ "$print_only" = true ]; then
  [ -n "$cmd" ] && echo "$cmd"
  exit 0
fi

if [ -z "$cmd" ]; then
  echo "scoped-check: nema izmena u kodu u odnosu na $base, nema sta da se proverava."
  exit 0
fi
echo "scoped-check (base $base): $cmd"
bash -c "$cmd"
