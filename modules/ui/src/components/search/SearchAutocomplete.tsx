import { forwardRef, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { SearchSuggestion, SearchSuggestionType } from '@fe/domain';
import { useSearchSuggestions } from '../../hooks/useSearchSuggestions';
import { computePopupMaxHeight } from './popupMaxHeight';
import styles from './SearchAutocomplete.module.css';

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Called on Enter when no suggestion is highlighted. */
  onSubmit: () => void;
  label: string;
  placeholder?: string;
}

interface Group {
  type: SearchSuggestionType;
  items: { suggestion: SearchSuggestion; index: number }[];
}

// Groups follow the order in which each type first arrives; the server order inside a group is kept.
function groupSuggestions(suggestions: SearchSuggestion[]): {
  groups: Group[];
  flat: SearchSuggestion[];
} {
  const byType = new Map<SearchSuggestionType, SearchSuggestion[]>();
  for (const s of suggestions) {
    const list = byType.get(s.type);
    if (list) list.push(s);
    else byType.set(s.type, [s]);
  }
  const flat: SearchSuggestion[] = [];
  const groups: Group[] = [];
  for (const [type, list] of byType) {
    groups.push({
      type,
      items: list.map((suggestion) => {
        flat.push(suggestion);
        return { suggestion, index: flat.length - 1 };
      }),
    });
  }
  return { groups, flat };
}

export const SearchAutocomplete = forwardRef<HTMLInputElement, Props>(function SearchAutocomplete(
  { value, onChange, onSubmit, label, placeholder },
  forwardedRef,
) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const baseId = useId();
  const listId = `${baseId}-list`;
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  const { data, isFetching, isError } = useSearchSuggestions(value);
  const { groups, flat } = useMemo(() => groupSuggestions(data ?? []), [data]);

  const hasText = value.trim().length > 0;
  const open = focused && hasText && !dismissed;
  const optionId = (i: number) => `${baseId}-option-${i}`;
  const activeValid = open && activeIndex >= 0 && activeIndex < flat.length;

  const popupRef = useRef<HTMLDivElement>(null);

  // Cap the popup to the space left below it, so it never extends past the viewport bottom
  // (the sticky 3D hero does not move with page scroll). Direct style write: no state per pixel.
  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const apply = () => {
      frame = 0;
      const popup = popupRef.current;
      if (!popup) return;
      const { top } = popup.getBoundingClientRect();
      popup.style.maxHeight = `${computePopupMaxHeight(top, window.innerHeight)}px`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    return () => {
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [open]);

  // Keep the highlighted option inside the scrollable popup while navigating with arrows.
  useEffect(() => {
    if (!activeValid) return;
    document.getElementById(`${baseId}-option-${activeIndex}`)?.scrollIntoView?.({
      block: 'nearest',
    });
  }, [activeIndex, activeValid, baseId]);

  const select = (suggestion: SearchSuggestion) => {
    setDismissed(true);
    setActiveIndex(-1);
    if (suggestion.type === 'PLACE') {
      // PLACE id is the city name, consumed by the search page as the `city` param.
      const params = new URLSearchParams({ q: value.trim(), city: suggestion.id });
      navigate(`/search?${params.toString()}`);
    } else if (suggestion.type === 'CATEGORY') {
      navigate(`/businesses/category/${suggestion.id}`);
    } else {
      navigate(`/businesses/${suggestion.id}`);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setDismissed(false);
      if (flat.length > 0) setActiveIndex((i) => (i + 1) % flat.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flat.length > 0) setActiveIndex((i) => (i <= 0 ? flat.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      if (activeValid) {
        e.preventDefault();
        select(flat[activeIndex]);
      } else {
        onSubmit();
      }
    } else if (e.key === 'Escape') {
      setDismissed(true);
      setActiveIndex(-1);
    }
  };

  let status: string | null = null;
  if (open && flat.length === 0) {
    if (isError) status = t('searchAutocomplete.error');
    else if (isFetching) status = t('searchAutocomplete.loading');
    else if (data) status = t('searchAutocomplete.empty');
  }

  return (
    <div className={styles.wrapper}>
      <input
        ref={setInputRef}
        role="combobox"
        aria-label={label}
        aria-autocomplete="list"
        aria-expanded={open && flat.length > 0}
        aria-controls={listId}
        aria-activedescendant={activeValid ? optionId(activeIndex) : undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setDismissed(false);
          setActiveIndex(-1);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={handleKeyDown}
      />
      {open && (
        <div
          ref={popupRef}
          className={styles.popup}
          data-search-popup
          // Keep focus in the input when the scrollbar or popup chrome is pressed, so the list stays open.
          onMouseDown={(e) => e.preventDefault()}
        >
          <div
            id={listId}
            role="listbox"
            aria-label={t('searchAutocomplete.listLabel')}
            hidden={flat.length === 0}
          >
            {groups.map((group) => {
              const headerId = `${baseId}-group-${group.type}`;
              return (
                <div key={group.type} role="group" aria-labelledby={headerId}>
                  <div id={headerId} className={styles.groupHeader} role="presentation">
                    {t(`searchAutocomplete.group${group.type}`)}
                  </div>
                  {group.items.map(({ suggestion, index }) => (
                    <div
                      key={`${suggestion.type}:${suggestion.id}`}
                      id={optionId(index)}
                      role="option"
                      aria-selected={index === activeIndex}
                      className={`${styles.option} ${index === activeIndex ? styles.optionActive : ''}`}
                      // Keep focus in the input so blur does not close the list before the click lands.
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => select(suggestion)}
                    >
                      {suggestion.name}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {status && (
            <div className={styles.status} role="status">
              {status}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
