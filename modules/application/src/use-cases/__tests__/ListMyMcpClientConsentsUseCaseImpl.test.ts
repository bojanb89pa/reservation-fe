import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListMyMcpClientConsentsUseCaseImpl } from '../mcp-consent/ListMyMcpClientConsentsUseCaseImpl';
import type { McpClientConsent, McpClientConsentRepository } from '@fe/domain';

let mockRepository: McpClientConsentRepository;

beforeEach(() => {
  mockRepository = {
    getMine: vi.fn(),
    revoke: vi.fn(),
  };
});

describe('ListMyMcpClientConsentsUseCaseImpl', () => {
  it('delegates to repository.getMine and returns the consents', async () => {
    const consents: McpClientConsent[] = [
      {
        clientId: 'https://claude.ai/oauth/client.json',
        clientName: 'Claude',
        clientHost: 'claude.ai',
        scopes: ['reservations:read'],
        grantedAt: '2026-11-01T10:00:00Z',
      },
    ];
    mockRepository.getMine = vi.fn().mockResolvedValue(consents);

    const result = await new ListMyMcpClientConsentsUseCaseImpl(mockRepository).execute();

    expect(mockRepository.getMine).toHaveBeenCalledTimes(1);
    expect(result).toBe(consents);
  });

  it('returns an empty list when the user has no consents', async () => {
    mockRepository.getMine = vi.fn().mockResolvedValue([]);

    const result = await new ListMyMcpClientConsentsUseCaseImpl(mockRepository).execute();

    expect(result).toEqual([]);
  });

  it('propagates repository errors', async () => {
    mockRepository.getMine = vi.fn().mockRejectedValue(new Error('boom'));

    await expect(new ListMyMcpClientConsentsUseCaseImpl(mockRepository).execute()).rejects.toThrow('boom');
  });
});
