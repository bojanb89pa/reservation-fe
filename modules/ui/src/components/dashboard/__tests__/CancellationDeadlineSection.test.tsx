import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BusinessErrorCode } from '@fe/domain';
import type { Business } from '@fe/domain';
import { CancellationDeadlineSection } from '../CancellationDeadlineSection';
import '../../../i18n';

const setExecute = vi.fn();
const removeExecute = vi.fn();
let currentUserId: string | null = 'owner-1';

vi.mock('../../../app/container', () => ({
  AUTH_SESSION_EXPIRED_EVENT: 'auth:session-expired',
  tokenStorage: { getAccessToken: () => null },
  setCancellationDeadlineUseCase: { execute: (...a: unknown[]) => setExecute(...a) },
  removeCancellationDeadlineUseCase: { execute: (...a: unknown[]) => removeExecute(...a) },
}));

vi.mock('../../../hooks/useCurrentRoles', () => ({
  useCurrentUserId: () => currentUserId,
}));

const business: Business = {
  id: 'biz-1',
  name: 'Barber House',
  status: 'ACTIVE',
  ownerId: 'owner-1',
  categoryId: null,
  category: null,
  imageUrl: null,
  allowOverlappingPendingReservations: true,
  minNoticeMinutes: null,
};

function renderSection(b: Business = business) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CancellationDeadlineSection business={b} />
    </QueryClientProvider>,
  );
}

function submit(amount: string, unit?: string) {
  fireEvent.change(screen.getByLabelText('Cancel at the latest'), { target: { value: amount } });
  if (unit) fireEvent.change(screen.getByLabelText('Unit'), { target: { value: unit } });
  fireEvent.click(screen.getByRole('button', { name: 'Save deadline' }));
}

describe('CancellationDeadlineSection', () => {
  beforeEach(() => {
    setExecute.mockReset();
    removeExecute.mockReset();
    currentUserId = 'owner-1';
  });

  it('shows the no-deadline state and hides the remove button', () => {
    renderSection();
    expect(screen.getByRole('status')).toHaveTextContent(/No deadline/);
    expect(screen.queryByRole('button', { name: 'Remove deadline' })).not.toBeInTheDocument();
  });

  it('shows the current value', () => {
    renderSection({ ...business, minNoticeMinutes: 120 });
    expect(screen.getByRole('status')).toHaveTextContent('up to 2 hours before');
  });

  it('is hidden from a non-owner', () => {
    currentUserId = 'employee-1';
    renderSection();
    expect(screen.queryByRole('button', { name: 'Save deadline' })).not.toBeInTheDocument();
  });

  it.each([
    ['30', 'minutes', 30],
    ['2', 'hours', 120],
    ['3', 'days', 4320],
    ['30', 'days', 43200],
  ])('converts %s %s to %i minutes', async (amount, unit, minutes) => {
    setExecute.mockResolvedValue({ ...business, minNoticeMinutes: minutes });
    renderSection();
    submit(amount, unit);
    await waitFor(() => expect(setExecute).toHaveBeenCalledWith('biz-1', minutes));
  });

  it.each([
    ['0', 'minutes'],
    ['31', 'days'],
    ['43201', 'minutes'],
    ['1.5', 'minutes'],
    ['', 'minutes'],
  ])('rejects %s %s without calling the use case', async (amount, unit) => {
    renderSection();
    submit(amount, unit);
    expect(await screen.findByRole('alert')).toHaveTextContent(/between 1 minute and 30 days/);
    expect(setExecute).not.toHaveBeenCalled();
  });

  it('removes the deadline', async () => {
    removeExecute.mockResolvedValue(business);
    renderSection({ ...business, minNoticeMinutes: 60 });
    fireEvent.click(screen.getByRole('button', { name: 'Remove deadline' }));
    await waitFor(() => expect(removeExecute).toHaveBeenCalledWith('biz-1'));
  });

  it('shows the BE validation error in the form', async () => {
    setExecute.mockRejectedValue(
      Object.assign(new Error('x'), { code: BusinessErrorCode.CANCELLATION_MIN_NOTICE_INVALID }),
    );
    renderSection();
    submit('5', 'minutes');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The deadline must be between 1 minute and 30 days.',
    );
  });

  it('shows a localized message on OWNER_REQUIRED', async () => {
    removeExecute.mockRejectedValue(
      Object.assign(new Error('x'), { code: BusinessErrorCode.OWNER_REQUIRED }),
    );
    renderSection({ ...business, minNoticeMinutes: 60 });
    fireEvent.click(screen.getByRole('button', { name: 'Remove deadline' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Only the business owner can change this setting.',
    );
  });
});
