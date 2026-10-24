import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '../../../i18n';

vi.mock('../../../app/container', () => ({ env: { appSiteUrl: 'http://reserva.test/' } }));

import { WidgetWatermark } from '../WidgetWatermark';

describe('WidgetWatermark', () => {
  it('links to the app site (VITE_APP_SITE_URL) in a new tab', () => {
    render(<WidgetWatermark />);
    const link = screen.getByRole('link', { name: /by Reserva/ });
    expect(link).toHaveAttribute('href', 'http://reserva.test/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener');
    expect(link).toHaveTextContent('by Reserva');
  });
});
