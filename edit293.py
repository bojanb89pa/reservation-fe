import os
os.chdir('modules/ui/src')

def edit(p, fn):
    s = open(p).read()
    s = fn(s)
    open(p, 'w').write(s)

def ac(s):
    s = s.replace("import { useId, useMemo, useState } from 'react';",
                  "import { forwardRef, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';")
    s = s.replace("export function SearchAutocomplete({ value, onChange, onSubmit, label, placeholder }: Props) {\n",
                  "export const SearchAutocomplete = forwardRef<HTMLInputElement, Props>(function SearchAutocomplete(\n  { value, onChange, onSubmit, label, placeholder },\n  forwardedRef,\n) {\n")
    s = s.replace("  const { data, isFetching", """  const inputRef = useRef<HTMLInputElement | null>(null);
  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  const { data, isFetching""", 1)
    s = s.replace("  const select = (", """  // Keep the highlighted option inside the scrollable popup while navigating with arrows.
  useEffect(() => {
    if (!activeValid) return;
    document.getElementById(`${baseId}-option-${activeIndex}`)?.scrollIntoView?.({
      block: 'nearest',
    });
  }, [activeIndex, activeValid, baseId]);

  const select = (""", 1)
    s = s.replace("      <input\n        role", "      <input\n        ref={setInputRef}\n        role")
    s = s.replace("        <div className={styles.popup}>", """        <div
          className={styles.popup}
          data-search-popup
          // Keep focus in the input when the scrollbar or popup chrome is pressed, so the list stays open.
          onMouseDown={(e) => e.preventDefault()}
        >""")
    s = s.rstrip()
    assert s.endswith("}")
    return s[:-1] + "});\n"
edit('components/search/SearchAutocomplete.tsx', ac)

def acc(s):
    s = s.replace("  overflow: hidden;\n  text-align: left;",
                  "  max-height: 55vh;\n  max-height: min(420px, 55dvh);\n  overflow-y: auto;\n  overscroll-behavior: contain;\n  scroll-padding-top: 32px;\n  text-align: left;")
    s = s.replace(".groupHeader {\n", ".groupHeader {\n  position: sticky;\n  top: 0;\n  background: var(--surface);\n")
    s = s.replace(".option {", """.wrapper input:focus-visible {
  /* The surrounding bar shows the focus ring; no second frame on the input. */
  box-shadow: none;
  border-radius: 0;
}

.option {""", 1)
    return s
edit('components/search/SearchAutocomplete.module.css', acc)

def srp(s):
    s = s.replace("import { useState, useEffect } from 'react';", "import { useState, useEffect, useRef } from 'react';")
    s = s.replace("import { SearchAutocomplete }", "import { focusInputOnBarMouseDown } from '../components/search/focusInputOnBarMouseDown';\nimport { SearchAutocomplete }")
    s = s.replace("  const [page, setPage] = useState(0);\n", "  const [page, setPage] = useState(0);\n  const inputRef = useRef<HTMLInputElement>(null);\n", 1)
    s = s.replace("<div className={styles.searchBar}>", "<div className={styles.searchBar} onMouseDown={(e) => focusInputOnBarMouseDown(e, inputRef)}>")
    s = s.replace("          <SearchAutocomplete\n", "          <SearchAutocomplete\n            ref={inputRef}\n")
    return s
edit('pages/SearchResultsPage.tsx', srp)

def srpc(s):
    s = s.replace("  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);\n}\n", """  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  cursor: text;
  position: relative;
  z-index: 2;
  transition:
    border-color var(--dur-base) var(--ease-standard),
    box-shadow var(--dur-base) var(--ease-standard);
}

.searchBar:focus-within {
  border-color: var(--primary);
  box-shadow: var(--glow-focus);
}
""", 1)
    s = s.replace("  margin-bottom: 2px;\n}", "  margin-bottom: 2px;\n  user-select: none;\n}", 1)
    return s
edit('pages/SearchResultsPage.module.css', srpc)

def hp(s):
    s = s.replace("import { useRef, useState } from 'react';", "import { useCallback, useEffect, useRef, useState } from 'react';\nimport { flushSync } from 'react-dom';")
    s = s.replace("import { SearchAutocomplete }", "import { focusInputOnBarMouseDown } from '../components/search/focusInputOnBarMouseDown';\nimport { SearchAutocomplete }")
    s = s.replace("""  const handleSearch = () => {""", """  const inputRef = useRef<HTMLInputElement>(null);
  const searchShellRef = useRef<HTMLDivElement>(null);

  // Programmatic focus never scrolls by itself (preventScroll); scrolling to the bar is opt-in.
  const focusSearch = useCallback(
    ({ scroll = false }: { scroll?: boolean } = {}) => {
      if (scroll) {
        searchShellRef.current?.scrollIntoView({
          block: 'start',
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
      }
      const input = inputRef.current;
      if (!input) return;
      input.focus({ preventScroll: true });
      const end = input.value.length;
      input.setSelectionRange(end, end);
    },
    [prefersReducedMotion],
  );

  // Desktop only: typing anywhere on the page starts a search.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(DESKTOP_QUERY);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.length !== 1 || e.key === ' ' || e.isComposing) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      const active = document.activeElement;
      if (active?.closest('input, textarea, select, [contenteditable]')) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      e.preventDefault();
      flushSync(() => setWhat((v) => v + e.key));
      focusSearch({ scroll: true });
    };

    let attached = false;
    const sync = () => {
      if (mql.matches && !attached) {
        document.addEventListener('keydown', onKeyDown);
        attached = true;
      } else if (!mql.matches && attached) {
        document.removeEventListener('keydown', onKeyDown);
        attached = false;
      }
    };
    sync();
    mql.addEventListener('change', sync);
    return () => {
      mql.removeEventListener('change', sync);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [focusSearch]);

  const handleSearch = () => {""", 1)
    s = s.replace("// ─── Motion", "const DESKTOP_QUERY = '(hover: hover) and (pointer: fine)';\n\n// ─── Motion", 1)
    s = s.replace("""        <div className={styles.gridOverlay} />
        <motion.div
          className={styles.orb1}
          style={prefersReducedMotion ? undefined : { y: orbY1 }}
        />
        <motion.div
          className={styles.orb2}
          style={prefersReducedMotion ? undefined : { y: orbY2 }}
        />
        <motion.div
          className={styles.orb3}
          style={prefersReducedMotion ? undefined : { y: orbY3 }}
        />
""", """        <div className={styles.heroBackdrop} aria-hidden="true">
          <div className={styles.gridOverlay} />
          <motion.div
            className={styles.orb1}
            style={prefersReducedMotion ? undefined : { y: orbY1 }}
          />
          <motion.div
            className={styles.orb2}
            style={prefersReducedMotion ? undefined : { y: orbY2 }}
          />
          <motion.div
            className={styles.orb3}
            style={prefersReducedMotion ? undefined : { y: orbY3 }}
          />
        </div>
""")
    s = s.replace("<motion.div variants={rise} className={styles.searchShell}>\n            <div className={styles.search}>",
                  "<motion.div variants={rise} className={styles.searchShell} ref={searchShellRef}>\n            <div className={styles.search} onMouseDown={(e) => focusInputOnBarMouseDown(e, inputRef)}>")
    s = s.replace("                <SearchAutocomplete\n", "                <SearchAutocomplete\n                  ref={inputRef}\n")
    return s
edit('pages/HomePage.tsx', hp)

def hpc(s):
    s = s.replace("  position: relative;\n  overflow: hidden;\n}\n", "  position: relative;\n  /* Orbs are clipped in .heroBackdrop; the suggestion popup must not be cut off by the hero. */\n  overflow-x: clip;\n}\n\n.heroBackdrop {\n  position: absolute;\n  inset: 0;\n  overflow: hidden;\n  pointer-events: none;\n}\n", 1)
    s = s.replace("  max-width: 680px;\n  position: relative;\n", "  max-width: 680px;\n  position: relative;\n  /* Own stacking level above .liveHint, below the sticky header (z-index 50). */\n  z-index: 2;\n  /* Sticky header height + breathing room when scrolled into view. */\n  scroll-margin-top: 136px;\n", 1)
    s = s.replace("  padding: 6px 6px 6px 24px;\n", "  padding: 6px 6px 6px 24px;\n  cursor: text;\n", 1)
    s = s.replace("  margin-bottom: 3px;\n}", "  margin-bottom: 3px;\n  user-select: none;\n}", 1)
    s = s.replace("  outline: none;\n  width: 100%;", "  outline: none;\n  cursor: text;\n  width: 100%;", 1)
    return s
edit('pages/HomePage.module.css', hpc)
