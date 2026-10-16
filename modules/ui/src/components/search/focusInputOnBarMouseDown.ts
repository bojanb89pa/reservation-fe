import type { MouseEvent, RefObject } from 'react';

/**
 * Mousedown on the search bar chrome (padding, label, margins) focuses the input,
 * so the whole bar behaves like one text field. The input, buttons, links and the
 * suggestion popup keep their own behaviour.
 */
export function focusInputOnBarMouseDown(
  e: MouseEvent<HTMLElement>,
  inputRef: RefObject<HTMLInputElement | null>,
) {
  if (!(e.target instanceof Element)) return;
  if (e.target.closest('input, button, a, [data-search-popup]')) return;
  e.preventDefault();
  inputRef.current?.focus();
}
