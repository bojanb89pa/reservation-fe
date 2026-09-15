import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BusinessCard } from '../BusinessCard';
import '../../../i18n';

const business = {
  id: 'biz-1',
  name: 'Maison Kohl',
  category: null,
  imageUrl: null,
};

describe('BusinessCard', () => {
  it('does not render a distance badge when distanceKm is not given', () => {
    render(
      <MemoryRouter>
        <BusinessCard business={business} />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/km away/)).toBeNull();
  });

  it('renders the distance badge when distanceKm is given, rounded to one decimal', () => {
    render(
      <MemoryRouter>
        <BusinessCard business={business} distanceKm={2.567} />
      </MemoryRouter>,
    );
    expect(screen.getByText('2.6 km away')).toBeInTheDocument();
  });

  it('links to the business detail page', () => {
    render(
      <MemoryRouter>
        <BusinessCard business={business} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', '/businesses/biz-1');
  });
});
