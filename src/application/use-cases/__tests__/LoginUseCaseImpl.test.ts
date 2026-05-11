import { describe, it, expect, vi } from 'vitest';
import { LoginUseCaseImpl } from '../auth/LoginUseCaseImpl';
import type { AuthRepository } from '@domain/repositories/AuthRepository';
import type { AuthSession } from '@domain/entities/AuthSession';

const mockSession: AuthSession = {
  accessToken: 'tok-abc',
  tokenType: 'Bearer',
  expiresIn: 3600,
  scope: 'openid',
};

const mockAuthRepository: AuthRepository = {
  login: vi.fn().mockResolvedValue(mockSession),
  register: vi.fn(),
  logout: vi.fn(),
  refreshToken: vi.fn(),
};

describe('LoginUseCaseImpl', () => {
  it('delegates to authRepository.login with credentials', async () => {
    const useCase = new LoginUseCaseImpl(mockAuthRepository);
    const result = await useCase.execute({ email: 'test@example.com', password: 'secret' });

    expect(mockAuthRepository.login).toHaveBeenCalledWith('test@example.com', 'secret');
    expect(result).toEqual(mockSession);
  });
});
