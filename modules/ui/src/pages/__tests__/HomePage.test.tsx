import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { HomePage } from '../HomePage';
import '../../i18n';

vi.mock('../../hooks/useBusinesses', () => ({
  useSearchBusinesses: () => ({ data: undefined, isLoading: false }),
}));
vi.mock('../../hooks/useBusinessCategories', () => ({
  useBusinessCategories: () => ({ data: [] }),
}));
vi.mock('../../hooks/useSearchSuggestions', () => ({
  useSearchSuggestions: (text: string) => ({
    data: text.trim()
      ? [
          { type: 'PLACE', id: 'Novi Sad', name: 'Novi Sad' },
          { type: 'BUSINESS', id: 'biz-1', name: 'Salon Ana' },
        ]
      : [],
    isFetching: false,
    isError: false,
  }),
}));

// framer-motion's whileInView needs IntersectionObserver, which jsdom lacks.
vi.stubGlobal(
  'IntersectionObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

function Location() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname + loc.search}</div>;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="*" element={<HomePage />} />
      </Routes>
      <Location />
    </MemoryRouter>,
  );
}

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<() => void>();
  const mql = {
    matches,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  };
  vi.stubGlobal('matchMedia', () => mql);
  return {
    set(next: boolean) {
      mql.matches = next;
      listeners.forEach((cb) => cb());
    },
  };
}

function press(key: string, init: KeyboardEventInit = {}, target: Element = document.body) {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  act(() => {
    target.dispatchEvent(ev);
  });
  return ev;
}

describe('HomePage type-to-focus', () => {
  const scrollIntoView = vi.fn();
  beforeEach(() => {
    scrollIntoView.mockReset();
    Element.prototype.scrollIntoView = scrollIntoView;
    mockMatchMedia(true);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    document.body.replaceChildren();
  });

  it('typing a character focuses the search, fills it and scrolls to the bar', async () => {
    renderPage();
    const ev = press('s');
    expect(ev.defaultPrevented).toBe(true);
    const input = screen.getByRole('combobox');
    await waitFor(() => expect(input).toHaveFocus());
    expect(input).toHaveValue('s');
    expect(scrollIntoView).toHaveBeenCalled();
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
  });

  it.each([
    ['space', ' ', {}],
    ['Tab', 'Tab', {}],
    ['Escape', 'Escape', {}],
    ['ArrowDown', 'ArrowDown', {}],
    ['F5', 'F5', {}],
    ['Ctrl+a', 'a', { ctrlKey: true }],
    ['Meta+a', 'a', { metaKey: true }],
    ['Alt+a', 'a', { altKey: true }],
    ['composing', 'a', { isComposing: true }],
  ])('ignores %s', (_name, key, init) => {
    renderPage();
    const ev = press(key, init);
    expect(ev.defaultPrevented).toBe(false);
    expect(screen.getByRole('combobox')).toHaveValue('');
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('ignores typing in another field', () => {
    renderPage();
    const other = document.createElement('textarea');
    document.body.appendChild(other);
    other.focus();
    press('a', {}, other);
    expect(screen.getByRole('combobox')).toHaveValue('');
  });

  it('ignores typing while a modal dialog is open', () => {
    renderPage();
    const dialog = document.createElement('div');
    dialog.setAttribute('aria-modal', 'true');
    document.body.appendChild(dialog);
    press('a');
    expect(screen.getByRole('combobox')).toHaveValue('');
  });

  it('does nothing on touch devices and follows media query changes', () => {
    const mq = mockMatchMedia(false);
    renderPage();
    expect(press('a').defaultPrevented).toBe(false);
    mq.set(true);
    expect(press('b').defaultPrevented).toBe(true);
    mq.set(false);
    expect(press('c').defaultPrevented).toBe(false);
  });

  it('stops listening after unmount', () => {
    const { unmount } = renderPage();
    unmount();
    expect(press('a').defaultPrevented).toBe(false);
  });

  it('mousedown on the bar chrome focuses the input, the button is left alone', () => {
    renderPage();
    const input = screen.getByRole('combobox');
    const label = input.parentElement?.previousElementSibling as Element;
    expect(fireEvent.mouseDown(label)).toBe(false);
    expect(input).toHaveFocus();

    const go = screen.getByRole('button', { name: 'Search' });
    expect(fireEvent.mouseDown(go)).toBe(true);
  });

  it('programmatic focus on an empty field does not open the list', () => {
    renderPage();
    screen.getByRole('combobox').focus({ preventScroll: true });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});

describe('HomePage search', () => {
  it('renders a single search combobox and no "Where" field', () => {
    renderPage();
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
    expect(screen.queryByText('Where')).toBeNull();
    expect(screen.queryByText('Gde')).toBeNull();
  });

  it('Enter without a selection navigates to a free search', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByRole('combobox'), 'salon{Enter}');
    expect(screen.getByTestId('location')).toHaveTextContent('/search?q=salon');
  });

  it('selecting a place goes to /search with q and city', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByRole('combobox'), 'salon');
    await user.click(await screen.findByRole('option', { name: 'Novi Sad' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/search?q=salon&city=Novi+Sad');
  });
});
