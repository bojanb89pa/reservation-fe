import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ReservationSlotTakenError } from '@domain';
import type { BookingSelection } from '../../components/booking/BookingWidget';
import { BusinessDetailPage } from '../BusinessDetailPage';
import '../../i18n';

const createReservation = vi.fn();
const invalidateSlots = vi.fn();
const refetchBusiness = vi.fn();
let businessState: Record<string, unknown>;

const selection = {
  resource: { id: 'res-1' },
  service: { id: 'svc-1' },
  startTime: '2026-10-20T10:00:00',
  endTime: '2026-10-20T11:00:00',
} as unknown as BookingSelection;

vi.mock('../../hooks/useBusinesses', () => ({
  useBusiness: () => businessState,
}));
vi.mock('../../hooks/useResources', () => ({
  useResources: () => ({ data: { content: [] }, isLoading: false }),
}));
vi.mock('../../hooks/useBusinessServices', () => ({
  useBusinessServices: () => ({ data: [] }),
}));
vi.mock('../../hooks/useBusinessLocations', () => ({
  useBusinessLocations: () => ({ data: [] }),
}));
vi.mock('../../hooks/useReservations', () => ({
  useCreateReservation: () => ({ mutateAsync: createReservation, isPending: false }),
}));
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true, initiateLogin: vi.fn() }),
}));
vi.mock('../../hooks/useResourceSlots', () => ({
  useInvalidateResourceSlots: () => invalidateSlots,
}));
vi.mock('../../components/booking/BookingWidget', () => ({
  BookingWidget: ({ onConfirm }: { onConfirm: (s: BookingSelection) => Promise<void> }) => (
    <button onClick={() => onConfirm(selection)}>confirm</button>
  ),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/businesses/biz-1']}>
      <Routes>
        <Route path="/businesses/:id" element={<BusinessDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('BusinessDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    businessState = {
      data: { id: 'biz-1', name: 'Maison Kohl', category: null, imageUrl: null },
      isLoading: false,
      isError: false,
      error: null,
      refetch: refetchBusiness,
      isRefetching: false,
    };
  });

  it('shows a retryable error when the business fails to load', async () => {
    businessState = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: { status: 500 },
      refetch: refetchBusiness,
      isRefetching: false,
    };
    renderPage();

    await userEvent.click(screen.getByTestId('load-error-retry'));

    expect(refetchBusiness).toHaveBeenCalledTimes(1);
  });

  it('shows an alert and does not reject when creating the reservation fails', async () => {
    createReservation.mockRejectedValue(new Error('500'));
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'confirm' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your reservation could not be sent. Please try again.',
    );
    expect(invalidateSlots).not.toHaveBeenCalled();
  });

  it('keeps the slot-taken message and refreshes slots on ReservationSlotTakenError', async () => {
    createReservation.mockRejectedValue(new ReservationSlotTakenError('Slot taken.'));
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'confirm' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Slot taken.');
    expect(screen.getByRole('alert')).toHaveTextContent('Please pick a different time slot.');
    expect(invalidateSlots).toHaveBeenCalledWith('res-1');
  });
});
