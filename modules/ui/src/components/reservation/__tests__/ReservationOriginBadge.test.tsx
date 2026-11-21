import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReservationOriginBadge } from '../ReservationOriginBadge';
import i18n from '../../../i18n';

describe('ReservationOriginBadge', () => {
  it('renders nothing for RESERVA_APP', () => {
    render(<ReservationOriginBadge origin="RESERVA_APP" originClient={null} />);
    expect(screen.queryByTestId('reservation-origin-badge')).toBeNull();
  });

  it('renders partner label for CLIENT_APPLICATION', async () => {
    await i18n.changeLanguage('en');
    render(<ReservationOriginBadge origin="CLIENT_APPLICATION" originClient={null} />);
    expect(screen.getByTestId('reservation-origin-badge')).toHaveTextContent('Partner');
  });

  it('renders AI assistant with client name', async () => {
    await i18n.changeLanguage('en');
    render(<ReservationOriginBadge origin="AI_ASSISTANT" originClient="Claude" />);
    expect(screen.getByTestId('reservation-origin-badge')).toHaveTextContent(
      'Booked via AI assistant (Claude)',
    );
  });

  it('renders plain AI assistant when originClient is null', async () => {
    await i18n.changeLanguage('en');
    render(<ReservationOriginBadge origin="AI_ASSISTANT" originClient={null} />);
    expect(screen.getByTestId('reservation-origin-badge').textContent).toBe('AI assistant');
  });

  it('treats unknown origin as RESERVA_APP', () => {
    render(<ReservationOriginBadge origin="SOMETHING_NEW" originClient="x" />);
    expect(screen.queryByTestId('reservation-origin-badge')).toBeNull();
  });

  it('renders HTML in originClient as plain text', async () => {
    await i18n.changeLanguage('en');
    const { container } = render(
      <ReservationOriginBadge origin="AI_ASSISTANT" originClient="<img src=x onerror=alert(1)>" />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByTestId('reservation-origin-badge').textContent).toContain(
      '<img src=x onerror=alert(1)>',
    );
  });
});
