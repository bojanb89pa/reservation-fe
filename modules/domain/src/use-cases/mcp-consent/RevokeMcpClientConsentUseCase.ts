export interface RevokeMcpClientConsentUseCase {
  execute(clientId: string): Promise<void>;
}
