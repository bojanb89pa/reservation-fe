import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ClientApplicationIntegration } from '@fe/domain';
import { ClientApplicationIntegrationForm } from '../ClientApplicationIntegrationForm';
import '../../../i18n';

const integration: ClientApplicationIntegration = {
  clientApplicationId: 'app-1',
  trustedIssuers: [
    {
      type: 'OIDC',
      issuer: 'https://idp.partner.com',
      jwksUri: null,
      audiences: ['reserva'],
    },
  ],
  allowedOrigins: ['https://partner.com'],
  allowedScopes: ['reservation:create'],
};

describe('ClientApplicationIntegrationForm', () => {
  it('prefills the current configuration and replaces it as a whole on save', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <ClientApplicationIntegrationForm
        integration={integration}
        onSubmit={onSubmit}
        isPending={false}
      />,
    );

    expect(screen.getByLabelText('Issuer 1 URL')).toHaveValue('https://idp.partner.com');

    fireEvent.change(screen.getByLabelText('Issuer 1 JWKS URI'), {
      target: { value: 'https://idp.partner.com/jwks' },
    });
    fireEvent.change(screen.getByLabelText('Allowed origins (one per line)'), {
      target: { value: 'https://partner.com\nhttps://app.partner.com' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /Read own reservations/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save integration' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        clientApplicationId: 'app-1',
        trustedIssuers: [
          {
            type: 'OIDC',
            issuer: 'https://idp.partner.com',
            jwksUri: 'https://idp.partner.com/jwks',
            audiences: ['reserva'],
          },
        ],
        allowedOrigins: ['https://partner.com', 'https://app.partner.com'],
        allowedScopes: ['reservation:create', 'reservation:read:own'],
      }),
    );
  });

  it('adds and removes issuers', () => {
    render(
      <ClientApplicationIntegrationForm
        integration={integration}
        onSubmit={vi.fn()}
        isPending={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add issuer' }));
    expect(screen.getByLabelText('Issuer 2 URL')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove issuer 1' }));
    expect(screen.queryByLabelText('Issuer 2 URL')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Issuer 1 URL')).toHaveValue('');
  });
});
