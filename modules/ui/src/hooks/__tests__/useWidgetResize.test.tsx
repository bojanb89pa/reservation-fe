import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { WIDGET_PROTOCOL_VERSION, WidgetMessageType } from '@fe/domain';
import { useWidgetResize } from '../useWidgetResize';

describe('useWidgetResize', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports the content height in both directions and skips repeats', () => {
    let trigger: () => void = () => undefined;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          trigger = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    let height = 400.2;
    const element = document.createElement('div');
    element.getBoundingClientRect = () => ({ height }) as DOMRect;
    const send = vi.fn();
    renderHook(() => useWidgetResize({ current: element }, send));

    const resize = (h: number) => ({
      v: WIDGET_PROTOCOL_VERSION,
      type: WidgetMessageType.RESIZE,
      height: h,
    });
    expect(send).toHaveBeenLastCalledWith(resize(401));
    height = 250;
    trigger();
    expect(send).toHaveBeenLastCalledWith(resize(250));
    trigger();
    expect(send).toHaveBeenCalledTimes(2);
  });
});
