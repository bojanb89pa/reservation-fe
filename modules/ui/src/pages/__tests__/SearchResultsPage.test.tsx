import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { SearchResult } from '@domain';
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

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/search?q=maison']}>
      <SearchResultsPage />
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
});
