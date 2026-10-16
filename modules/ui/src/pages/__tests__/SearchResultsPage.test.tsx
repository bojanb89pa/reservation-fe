import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { SearchResult } from '@fe/domain';
import { SearchResultsPage } from '../SearchResultsPage';
import '../../i18n';

const baseResult: SearchResult = {
  businessId: 'biz-1',
  businessName: 'Maison Kohl',
  categoryId: null,
  city: 'Beograd',
  similarityScore: 0.9,
  imageUrl: null,
};

let results: SearchResult[] = [];

vi.mock('../../hooks/useDiscoverySearch', () => ({
  useDiscoverySearch: () => ({
    data: { content: results, totalElements: results.length, totalPages: 1 },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('../../hooks/useSearchSuggestions', () => ({
  useSearchSuggestions: (text: string) => ({
    data: text.trim() ? [{ type: 'PLACE', id: 'Novi Sad', name: 'Novi Sad' }] : [],
    isFetching: false,
    isError: false,
  }),
}));

function Location() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname + loc.search}</div>;
}

function renderPage(url = '/search?q=maison') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/search" element={<SearchResultsPage />} />
      </Routes>
      <Location />
    </MemoryRouter>,
  );
}

describe('SearchResultsPage', () => {
  it('renders the business image when imageUrl is present', () => {
    results = [{ ...baseResult, imageUrl: 'https://cdn.example.com/kohl.jpg' }];
    renderPage();
    const img = screen.getByRole('img', { name: /Maison Kohl/ });
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/kohl.jpg');
  });

  it('renders the fallback placeholder when imageUrl is null', () => {
    results = [baseResult];
    renderPage();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('MK')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/businesses/biz-1');
  });

  it('renders one autocomplete field filled with the current q', () => {
    results = [baseResult];
    renderPage('/search?q=maison&city=Beograd');
    const boxes = screen.getAllByRole('combobox');
    expect(boxes).toHaveLength(1);
    expect(boxes[0]).toHaveValue('maison');
  });

  it('Enter runs a free search and drops the city', async () => {
    results = [baseResult];
    const user = userEvent.setup();
    renderPage('/search?q=maison&city=Beograd');
    const box = screen.getByRole('combobox');
    await user.clear(box);
    await user.type(box, 'salon{Enter}');
    expect(screen.getByTestId('location')).toHaveTextContent('/search?q=salon');
    expect(screen.getByTestId('location')).not.toHaveTextContent('city');
  });

  it('selecting a place sets q and city', async () => {
    results = [baseResult];
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Novi Sad' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/search?q=maison&city=Novi+Sad');
  });
});
