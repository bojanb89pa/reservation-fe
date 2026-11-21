import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RevokeMcpClientConsentUseCaseImpl } from '../mcp-consent/RevokeMcpClientConsentUseCaseImpl';
import { NotFoundError } from '@fe/domain';
import type { McpClientConsentRepository } from '@fe/domain';

let mockRepository: McpClientConsentRepository;

beforeEach(() => {
  mockRepository = {
    getMine: vi.fn(),
    revoke: vi.fn(),
  };
});

describe('RevokeMcpClientConsentUseCaseImpl', () => {
  it('delegates to repository.revoke with the client id', async () => {
    mockRepository.revoke = vi.fn().mockResolvedValue(undefined);

    await new RevokeMcpClientConsentUseCaseImpl(mockRepository).execute('https://claude.ai/oauth/client.json');

    expect(mockRepository.revoke).toHaveBeenCalledTimes(1);
    expect(mockRepository.revoke).toHaveBeenCalledWith('https://claude.ai/oauth/client.json');
  });

  it('propagates NotFoundError from the repository', async () => {
    const notFound = new NotFoundError('MCP client consent', 'x');
    mockRepository.revoke = vi.fn().mockRejectedValue(notFound);

    await expect(new RevokeMcpClientConsentUseCaseImpl(mockRepository).execute('x')).rejects.toBe(notFound);
  });

  it('propagates other repository errors', async () => {
    mockRepository.revoke = vi.fn().mockRejectedValue(new Error('network down'));

    await expect(new RevokeMcpClientConsentUseCaseImpl(mockRepository).execute('x')).rejects.toThrow('network down');
  });
});
