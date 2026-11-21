import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { McpClientConsentErrorCode, NotFoundError } from '@fe/domain';
import {
  listMyMcpClientConsentsUseCase,
  revokeMcpClientConsentUseCase,
} from '../app/container';

const MCP_CONSENTS_KEY = ['mcp-client-consents', 'mine'] as const;

function isConsentNotFound(error: unknown): boolean {
  if (error instanceof NotFoundError) return true;
  const code = (error as { code?: unknown } | null)?.code;
  const message = (error as { message?: unknown } | null)?.message;
  return (
    code === McpClientConsentErrorCode.CONSENT_NOT_FOUND ||
    message === McpClientConsentErrorCode.CONSENT_NOT_FOUND
  );
}

export function useMyMcpClientConsents() {
  return useQuery({
    queryKey: MCP_CONSENTS_KEY,
    queryFn: () => listMyMcpClientConsentsUseCase.execute(),
  });
}

export function useRevokeMcpClientConsent() {
  const queryClient = useQueryClient();
  const refetch = () => queryClient.invalidateQueries({ queryKey: MCP_CONSENTS_KEY });
  return useMutation({
    mutationFn: (clientId: string) => revokeMcpClientConsentUseCase.execute(clientId),
    onSuccess: refetch,
    // The consent is already gone (revoked elsewhere): just refresh the list.
    onError: (error) => {
      if (isConsentNotFound(error)) void refetch();
    },
  });
}

export { isConsentNotFound };
