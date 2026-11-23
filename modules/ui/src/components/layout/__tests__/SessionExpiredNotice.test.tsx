import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionExpiredNotice } from '../SessionExpiredNotice';
import '../../../i18n';

const consume = vi.fn();

vi.mock('../../../app/container', () => ({
  tokenStorage: { consumeSessionExpiredFlag: () => consume() },
}));

describe('SessionExpiredNotice', () => {
  beforeEach(() => {
    consume.mockReset();
  });

  it('shows the notice once and survives re-renders without consuming again', () => {
    consume.mockReturnValueOnce(true).mockReturnValue(false);
    const { rerender } = render(<SessionExpiredNotice />);
    expect(screen.getByRole('status')).toHaveTextContent(/session expired/i);
    rerender(<SessionExpiredNotice />);
    expect(consume).toHaveBeenCalledTimes(1);
  });

  it('disappears when dismissed and does not return on the next mount', () => {
    consume.mockReturnValueOnce(true).mockReturnValue(false);
    const first = render(<SessionExpiredNotice />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    first.unmount();
    render(<SessionExpiredNotice />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders nothing when the flag was not set', () => {
    consume.mockReturnValue(false);
    render(<SessionExpiredNotice />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
