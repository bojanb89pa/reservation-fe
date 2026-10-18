import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ClientApplication,
  ClientApplicationDetail,
  CreateClientApplicationCommand,
  SetClientApplicationEnabledCommand,
  UpdateClientApplicationIntegrationCommand,
} from '@fe/domain';
import {
  approveClientApplicationConsentUseCase,
  getClientApplicationIntegrationUseCase,
  getClientApplicationUseCase,
  getPublicClientApplicationIntegrationUseCase,
  listClientApplicationsUseCase,
  listMyClientApplicationConsentsUseCase,
  registerClientApplicationUseCase,
  setClientApplicationEnabledUseCase,
  revokeClientApplicationConsentUseCase,
  updateClientApplicationIntegrationUseCase,
} from '../app/container';

const CLIENT_APPLICATIONS_KEY = ['client-applications'] as const;
const MY_CONSENTS_KEY = ['client-application-consents', 'mine'] as const;

export function useClientApplications() {
  return useQuery({
    queryKey: CLIENT_APPLICATIONS_KEY,
    queryFn: () => listClientApplicationsUseCase.execute(),
  });
}

export function useCreateClientApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: CreateClientApplicationCommand) =>
      registerClientApplicationUseCase.execute(command),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLIENT_APPLICATIONS_KEY }),
  });
}

export function useClientApplication(id: string) {
  return useQuery({
    queryKey: [...CLIENT_APPLICATIONS_KEY, id],
    queryFn: () => getClientApplicationUseCase.execute(id),
    enabled: id !== '',
  });
}

export function useSetClientApplicationEnabled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: SetClientApplicationEnabledCommand) =>
      setClientApplicationEnabledUseCase.execute(command),
    onSuccess: (updated) => {
      queryClient.setQueryData<ClientApplicationDetail>(
        [...CLIENT_APPLICATIONS_KEY, updated.id],
        (old) => (old ? { ...old, ...updated } : old),
      );
      queryClient.setQueryData<ClientApplication[]>(CLIENT_APPLICATIONS_KEY, (old) =>
        old?.map((app) => (app.id === updated.id ? updated : app)),
      );
    },
  });
}

export function useClientApplicationIntegration(id: string) {
  return useQuery({
    queryKey: [...CLIENT_APPLICATIONS_KEY, id, 'integration'],
    queryFn: () => getClientApplicationIntegrationUseCase.execute(id),
    enabled: id !== '',
  });
}

export function useUpdateClientApplicationIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: UpdateClientApplicationIntegrationCommand) =>
      updateClientApplicationIntegrationUseCase.execute(command),
    onSuccess: (integration) =>
      queryClient.invalidateQueries({
        queryKey: [...CLIENT_APPLICATIONS_KEY, integration.clientApplicationId, 'integration'],
      }),
  });
}

export function useMyClientApplicationConsents() {
  return useQuery({
    queryKey: MY_CONSENTS_KEY,
    queryFn: () => listMyClientApplicationConsentsUseCase.execute(),
  });
}

export function usePublicClientApplicationIntegration(clientApplicationId: string) {
  return useQuery({
    queryKey: ['client-application-public-integration', clientApplicationId],
    queryFn: () => getPublicClientApplicationIntegrationUseCase.execute(clientApplicationId),
  });
}

export function useDecideClientApplicationConsent() {
  const queryClient = useQueryClient();
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: MY_CONSENTS_KEY });
  const approve = useMutation({
    mutationFn: (consentId: string) => approveClientApplicationConsentUseCase.execute(consentId),
    onSuccess,
  });
  const revoke = useMutation({
    mutationFn: (consentId: string) => revokeClientApplicationConsentUseCase.execute(consentId),
    onSuccess,
  });
  return { approve, revoke };
}
