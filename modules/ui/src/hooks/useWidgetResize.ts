import { useEffect } from 'react';
import type { RefObject } from 'react';
import { WIDGET_PROTOCOL_VERSION, WidgetMessageType } from '@fe/domain';
import type { WidgetToHostMessage } from '@fe/domain';

/** Reports the content height of `ref` to the loader (`reserva:resize`) whenever it changes. */
export function useWidgetResize(
  ref: RefObject<HTMLElement>,
  send: (message: WidgetToHostMessage) => void,
) {
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    let last = -1;
    const report = () => {
      const height = Math.ceil(element.getBoundingClientRect().height);
      if (height === last) return;
      last = height;
      send({ v: WIDGET_PROTOCOL_VERSION, type: WidgetMessageType.RESIZE, height });
    };
    const observer = new ResizeObserver(report);
    observer.observe(element);
    report();
    return () => observer.disconnect();
  }, [ref, send]);
}
