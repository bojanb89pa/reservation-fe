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
            inlineJwk: null,
            audiences: ['reserva'],
          },
        ],
        allowedOrigins: ['https://partner.com', 'https://app.partner.com'],
        allowedScopes: ['reservation:create', 'reservation:read:own'],
      }),
    );
  });

  describe('PARTNER_KEY issuer', () => {
    const publicJwk = '{"kty":"EC","crv":"P-256","x":"a","y":"b"}';

    function renderPartnerKey(onSubmit = vi.fn().mockResolvedValue(undefined)) {
      render(
        <ClientApplicationIntegrationForm
          integration={{ ...integration, trustedIssuers: [] }}
          onSubmit={onSubmit}
          isPending={false}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Add issuer' }));
      fireEvent.change(screen.getByLabelText('Issuer 1 type'), {
        target: { value: 'PARTNER_KEY' },
      });
      fireEvent.change(screen.getByLabelText('Issuer 1 URL'), {
        target: { value: 'https://partner.example' },
      });
      return onSubmit;
    }

    it('shows one key field at a time and hides audiences', () => {
      renderPartnerKey();
      expect(screen.queryByLabelText('Issuer 1 audiences')).not.toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'JWKS URL' })).toBeChecked();
      expect(screen.getByLabelText('Issuer 1 JWKS URI')).toBeInTheDocument();
      expect(screen.queryByLabelText('Issuer 1 inline JWK (JSON)')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('radio', { name: 'Inline JWK' }));
      expect(screen.getByLabelText('Issuer 1 inline JWK (JSON)')).toBeInTheDocument();
      expect(screen.queryByLabelText('Issuer 1 JWKS URI')).not.toBeInTheDocument();
    });

    it('sends the unused key field as null and audiences as []', async () => {
      const onSubmit = renderPartnerKey();
      fireEvent.click(screen.getByRole('radio', { name: 'Inline JWK' }));
      fireEvent.change(screen.getByLabelText('Issuer 1 inline JWK (JSON)'), {
        target: { value: publicJwk },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Save integration' }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0][0].trustedIssuers).toEqual([
        {
          type: 'PARTNER_KEY',
          issuer: 'https://partner.example',
          jwksUri: null,
          inlineJwk: publicJwk,
          audiences: [],
        },
      ]);
    });

    it('blocks saving and explains the problem for an invalid key', async () => {
      const onSubmit = renderPartnerKey();
      fireEvent.click(screen.getByRole('radio', { name: 'Inline JWK' }));
      fireEvent.change(screen.getByLabelText('Issuer 1 inline JWK (JSON)'), {
        target: { value: '{"kty":"RSA","n":"x","e":"AQAB","d":"secret"}' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Save integration' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/public only/i);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('requires a key and an absolute JWKS URL', async () => {
      const onSubmit = renderPartnerKey();
      fireEvent.click(screen.getByRole('button', { name: 'Save integration' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(/Fill in the JWKS URL/i);

      fireEvent.change(screen.getByLabelText('Issuer 1 JWKS URI'), { target: { value: '/jwks' } });
      expect(screen.getByRole('alert')).toHaveTextContent(/absolute URL/i);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('prefills INLINE_JWK when the stored issuer has an inline key', () => {
      render(
        <ClientApplicationIntegrationForm
          integration={{
            ...integration,
            trustedIssuers: [
              {
                type: 'PARTNER_KEY',
                issuer: 'partner-1',
                jwksUri: null,
                inlineJwk: publicJwk,
                audiences: [],
              },
            ],
          }}
          onSubmit={vi.fn()}
          isPending={false}
        />,
      );
      expect(screen.getByRole('radio', { name: 'Inline JWK' })).toBeChecked();
      expect(screen.getByLabelText('Issuer 1 inline JWK (JSON)')).toHaveValue(publicJwk);
    });
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
