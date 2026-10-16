import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
