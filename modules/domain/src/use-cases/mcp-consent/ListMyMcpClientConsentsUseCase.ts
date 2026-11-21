import type { McpClientConsent } from '../../entities/McpClientConsent';

export interface ListMyMcpClientConsentsUseCase {
  execute(): Promise<McpClientConsent[]>;
}
