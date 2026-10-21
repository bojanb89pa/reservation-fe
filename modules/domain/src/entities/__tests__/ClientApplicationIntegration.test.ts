import { describe, it, expect } from 'vitest';
import { validatePartnerKeyIssuer } from '../ClientApplicationIntegration';

const EC_JWK = JSON.stringify({ kty: 'EC', crv: 'P-256', x: 'x', y: 'y' });
const RSA_JWK = JSON.stringify({ kty: 'RSA', n: 'n', e: 'AQAB' });

describe('validatePartnerKeyIssuer', () => {
  it('accepts a JWKS URL', () => {
    expect(
      validatePartnerKeyIssuer({
        issuer: 'https://partner.example.com',
        jwksUri: 'https://partner.example.com/.well-known/jwks.json',
        inlineJwk: null,
      }),
    ).toBeNull();
  });

  it('accepts an inline EC P-256 or RSA public JWK', () => {
    expect(
      validatePartnerKeyIssuer({ issuer: 'partner-backend', jwksUri: null, inlineJwk: EC_JWK }),
    ).toBeNull();
    expect(
      validatePartnerKeyIssuer({ issuer: 'partner-backend', jwksUri: '', inlineJwk: RSA_JWK }),
    ).toBeNull();
  });

  it('rejects an empty issuer or one with whitespace', () => {
    expect(validatePartnerKeyIssuer({ issuer: ' ', jwksUri: null, inlineJwk: EC_JWK })).toBe(
      'ISSUER_INVALID',
    );
    expect(
      validatePartnerKeyIssuer({ issuer: 'partner backend', jwksUri: null, inlineJwk: EC_JWK }),
    ).toBe('ISSUER_INVALID');
  });

  it('requires exactly one key source; empty strings count as not sent', () => {
    expect(validatePartnerKeyIssuer({ issuer: 'p', jwksUri: '', inlineJwk: '  ' })).toBe(
      'KEY_MISSING',
    );
    expect(validatePartnerKeyIssuer({ issuer: 'p', jwksUri: null })).toBe('KEY_MISSING');
    expect(
      validatePartnerKeyIssuer({
        issuer: 'p',
        jwksUri: 'https://p.example.com/jwks',
        inlineJwk: EC_JWK,
      }),
    ).toBe('KEY_AMBIGUOUS');
  });

  it('rejects a relative JWKS URL', () => {
    expect(validatePartnerKeyIssuer({ issuer: 'p', jwksUri: '/jwks.json', inlineJwk: null })).toBe(
      'JWKS_URI_NOT_ABSOLUTE',
    );
    expect(
      validatePartnerKeyIssuer({
        issuer: 'p',
        jwksUri: 'partner.example.com/jwks',
        inlineJwk: null,
      }),
    ).toBe('JWKS_URI_NOT_ABSOLUTE');
  });

  it('rejects an inline JWK that is not a JSON object', () => {
    expect(validatePartnerKeyIssuer({ issuer: 'p', jwksUri: null, inlineJwk: '{bad' })).toBe(
      'INLINE_JWK_NOT_JSON_OBJECT',
    );
    expect(validatePartnerKeyIssuer({ issuer: 'p', jwksUri: null, inlineJwk: `[${EC_JWK}]` })).toBe(
      'INLINE_JWK_NOT_JSON_OBJECT',
    );
  });

  it('rejects an unsupported key type or curve', () => {
    const p384 = JSON.stringify({ kty: 'EC', crv: 'P-384', x: 'x', y: 'y' });
    const oct = JSON.stringify({ kty: 'oct', k: 'k' });
    expect(validatePartnerKeyIssuer({ issuer: 'p', jwksUri: null, inlineJwk: p384 })).toBe(
      'INLINE_JWK_UNSUPPORTED_KEY',
    );
    expect(validatePartnerKeyIssuer({ issuer: 'p', jwksUri: null, inlineJwk: oct })).toBe(
      'INLINE_JWK_UNSUPPORTED_KEY',
    );
  });

  it('rejects a private key', () => {
    const privateEc = JSON.stringify({ kty: 'EC', crv: 'P-256', x: 'x', y: 'y', d: 'd' });
    const privateRsa = JSON.stringify({ kty: 'RSA', n: 'n', e: 'AQAB', qi: 'qi' });
    expect(validatePartnerKeyIssuer({ issuer: 'p', jwksUri: null, inlineJwk: privateEc })).toBe(
      'INLINE_JWK_PRIVATE',
    );
    expect(validatePartnerKeyIssuer({ issuer: 'p', jwksUri: null, inlineJwk: privateRsa })).toBe(
      'INLINE_JWK_PRIVATE',
    );
  });
});
