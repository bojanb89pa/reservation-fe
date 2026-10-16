import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from '../HomePage';
import '../../i18n';

vi.mock('../../hooks/useBusinesses', () => ({
  useSearchBusinesses: () => ({ data: undefined, isLoading: false }),
}));
vi.mock('../../hooks/useBusinessCategories', () => ({
  useBusinessCategories: () => ({ data: [] }),
}));
vi.mock('../../hooks/useSearchSuggestions', () => ({
  useSearchSuggestions: () => ({ data: [], isFetching: false, isError: false }),
}));

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function stubDesktop(matches: boolean) {
  vi.stubGlobal('IntersectionObserver', NoopObserver);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.stubGlobal('matchMedia', () => ({
    matches,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

function renderPage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

describe('HomePage hero fallback (no 3D scene)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders the regular hero on a desktop without WebGL', () => {
    stubDesktop(true); // jsdom has no WebGL, so the scene must not be mounted
    const { container } = renderPage();
    expect(container.querySelector('canvas')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders the regular hero when the desktop media query does not match', () => {
    stubDesktop(false);
    const { container } = renderPage();
    expect(container.querySelector('canvas')).toBeNull();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
