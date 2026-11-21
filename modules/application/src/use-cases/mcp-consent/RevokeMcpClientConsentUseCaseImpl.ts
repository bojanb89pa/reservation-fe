import type { McpClientConsentRepository, RevokeMcpClientConsentUseCase } from '@fe/domain';

export class RevokeMcpClientConsentUseCaseImpl implements RevokeMcpClientConsentUseCase {
  constructor(private readonly consentRepository: McpClientConsentRepository) {}

  execute(clientId: string): Promise<void> {
    return this.consentRepository.revoke(clientId);
  }
}
