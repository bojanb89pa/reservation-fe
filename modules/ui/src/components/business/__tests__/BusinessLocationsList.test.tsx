import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { BusinessLocation } from '@domain';
import { BusinessLocationsList } from '../BusinessLocationsList';
import '../../../i18n';

describe('BusinessLocationsList', () => {
  const location: BusinessLocation = {
    id: 'loc-1',
    businessId: 'biz-1',
    name: 'Main branch',
    addressLine1: '123 Main St',
    addressLine2: 'Suite 100',
    city: 'Belgrade',
    postalCode: '11000',
    countryCode: 'RS',
    latitude: 44.8176,
    longitude: 20.4762,
    timezone: 'Europe/Belgrade',
    phone: '+381112345678',
    email: 'info@example.com',
    website: 'https://example.com',
    googlePlaceId: 'place-1',
    googleMapsUrl: 'https://maps.google.com/place-1',
    ownerConfirmed: true,
  };

  it('does not render when locations is undefined', () => {
    const { container } = render(<BusinessLocationsList locations={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render when locations is empty', () => {
    const { container } = render(<BusinessLocationsList locations={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders locations section with title and accessible label', () => {
    render(<BusinessLocationsList locations={[location]} />);
    const section = screen.getByRole('region', { name: /locations/i });
    expect(section).toBeInTheDocument();
  });

  it('renders address fields that are not null', () => {
    render(<BusinessLocationsList locations={[location]} />);
    expect(screen.getByText('Main branch')).toBeInTheDocument();
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
    expect(screen.getByText('Suite 100')).toBeInTheDocument();
    expect(screen.getByText(/11000.*Belgrade/)).toBeInTheDocument();
  });

  it('renders location without name', () => {
    const locWithoutName = { ...location, name: null };
    render(<BusinessLocationsList locations={[locWithoutName]} />);
    expect(screen.queryByText('Main branch')).not.toBeInTheDocument();
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
  });

  it('renders location with only required address parts', () => {
    const minimal: BusinessLocation = {
      ...location,
      name: null,
      addressLine1: '456 Oak Ave',
      addressLine2: null,
      city: null,
      postalCode: null,
    };
    render(<BusinessLocationsList locations={[minimal]} />);
    expect(screen.getByText('456 Oak Ave')).toBeInTheDocument();
    expect(screen.queryByText('Main branch')).not.toBeInTheDocument();
  });

  it('renders multiple locations', () => {
    const location2 = { ...location, id: 'loc-2', name: 'Second branch' };
    render(<BusinessLocationsList locations={[location, location2]} />);
    expect(screen.getByText('Main branch')).toBeInTheDocument();
    expect(screen.getByText('Second branch')).toBeInTheDocument();
  });
});
