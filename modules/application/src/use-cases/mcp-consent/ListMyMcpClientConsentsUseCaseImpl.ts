import type {
  ListMyMcpClientConsentsUseCase,
  McpClientConsent,
  McpClientConsentRepository,
} from '@fe/domain';

export class ListMyMcpClientConsentsUseCaseImpl implements ListMyMcpClientConsentsUseCase {
  constructor(private readonly consentRepository: McpClientConsentRepository) {}

  execute(): Promise<McpClientConsent[]> {
    return this.consentRepository.getMine();
  }
}
