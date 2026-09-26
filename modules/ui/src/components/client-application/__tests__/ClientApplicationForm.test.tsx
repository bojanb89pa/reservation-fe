import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Business, BusinessLocation, BusinessCategory, PageResponse } from '@domain';
import { ClientApplicationForm } from '../ClientApplicationForm';
import '../../../i18n';

const getAllBusinessesForAdminUseCase = { execute: vi.fn() };
const listBusinessLocationsUseCase = { execute: vi.fn() };
const listBusinessCategoriesUseCase = { execute: vi.fn() };

vi.mock('../../../app/container', () => ({
  getAllBusinessesForAdminUseCase: {
    execute: (...args: unknown[]) => getAllBusinessesForAdminUseCase.execute(...args),
  },
  listBusinessLocationsUseCase: {
    execute: (...args: unknown[]) => listBusinessLocationsUseCase.execute(...args),
  },
  listBusinessCategoriesUseCase: {
    execute: (...args: unknown[]) => listBusinessCategoriesUseCase.execute(...args),
  },
}));

const business: Business = {
  id: 'biz-1',
  name: 'Barber House',
  status: 'ACTIVE',
  ownerId: 'owner-1',
  categoryId: null,
  category: null,
  imageUrl: null,
};

const location: BusinessLocation = {
  id: 'loc-1',
  businessId: 'biz-1',
  name: 'Main branch',
  addressLine1: null,
  addressLine2: null,
  city: null,
  postalCode: null,
  countryCode: null,
  latitude: null,
  longitude: null,
  timezone: null,
  phone: null,
  email: null,
  website: null,
  googlePlaceId: null,
  googleMapsUrl: null,
  ownerConfirmed: true,
};

const category: BusinessCategory = {
  id: 'cat-1',
  name: 'Hair salon',
  parentId: null,
  symbol: null,
  color: null,
};

const businessesPage: PageResponse<Business> = {
  content: [business],
  page: 0,
  size: 100,
  totalElements: 1,
  totalPages: 1,
  nextCursor: null,
  prevCursor: null,
  hasNext: false,
  hasPrevious: false,
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ClientApplicationForm', () => {
  beforeEach(() => {
    getAllBusinessesForAdminUseCase.execute.mockResolvedValue(businessesPage);
    listBusinessLocationsUseCase.execute.mockResolvedValue([location]);
    listBusinessCategoriesUseCase.execute.mockResolvedValue([category]);
  });

  it('submits a SINGLE_LOCATION scope once a business and location are picked', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithClient(<ClientApplicationForm onSubmit={onSubmit} isPending={false} />);

    fireEvent.change(screen.getByLabelText('Application name'), {
      target: { value: 'Acme Widget' },
    });

    await waitFor(() => expect(screen.getByText('Barber House')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Business'), { target: { value: 'biz-1' } });

    await waitFor(() => expect(screen.getByText('Main branch')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'loc-1' } });

    fireEvent.click(screen.getByRole('button', { name: 'Register application' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Acme Widget',
        scope: { type: 'SINGLE_LOCATION', locationId: 'loc-1' },
      }),
    );
  });

  it('submits a CATEGORY scope when the category branch is selected', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithClient(<ClientApplicationForm onSubmit={onSubmit} isPending={false} />);

    fireEvent.change(screen.getByLabelText('Application name'), {
      target: { value: 'Category Widget' },
    });

    fireEvent.click(screen.getByRole('radio', { name: 'Business category' }));

    await waitFor(() => expect(screen.getByText('Hair salon')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'cat-1' } });

    fireEvent.click(screen.getByRole('button', { name: 'Register application' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Category Widget',
        scope: { type: 'CATEGORY', categoryId: 'cat-1' },
      }),
    );
  });

  it('disables submit until the name and scope are filled in', () => {
    renderWithClient(<ClientApplicationForm onSubmit={vi.fn()} isPending={false} />);
    expect(screen.getByRole('button', { name: 'Register application' })).toBeDisabled();
  });
});
