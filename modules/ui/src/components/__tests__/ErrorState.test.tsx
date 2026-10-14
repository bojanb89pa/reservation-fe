import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorState } from '../ErrorState';
import '../../i18n';

describe('ErrorState', () => {
  it('shows the message as an alert and calls onRetry on click', async () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Could not load." onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load.');
    await userEvent.click(screen.getByTestId('load-error-retry'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('disables the retry button while retrying', () => {
    render(<ErrorState message="Could not load." onRetry={vi.fn()} isRetrying />);

    expect(screen.getByTestId('load-error-retry')).toBeDisabled();
  });
});
