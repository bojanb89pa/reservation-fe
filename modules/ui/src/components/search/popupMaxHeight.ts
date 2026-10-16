const MAX_HEIGHT = 420;
const MIN_HEIGHT = 160;
const BOTTOM_GAP = 16;

/** Largest popup height that still fits between its top edge and the viewport bottom. */
export function computePopupMaxHeight(popupTop: number, viewportHeight: number): number {
  const space = viewportHeight - popupTop - BOTTOM_GAP;
  return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, space));
}
