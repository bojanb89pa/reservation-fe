import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ContactInfoType } from '@domain';
import {
  listContactInfoUseCase,
  addContactInfoUseCase,
  removeContactInfoUseCase,
  updateContactInfoUseCase,
} from '../app/container';

const contactInfoKeys = {
  byBusiness: (businessId: string) => ['businesses', businessId, 'contact-info'] as const,
};

export function useBusinessContactInfo(businessId: string) {
  return useQuery({
    queryKey: contactInfoKeys.byBusiness(businessId),
    queryFn: () => listContactInfoUseCase.execute(businessId),
    enabled: !!businessId,
  });
}

export function useAddContactInfo(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      type,
      value,
      label,
    }: {
      type: ContactInfoType;
      value: string;
      label?: string;
    }) => addContactInfoUseCase.execute({ businessId, type, value, label }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: contactInfoKeys.byBusiness(businessId) }),
  });
}

export function useRemoveContactInfo(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contactInfoId: string) =>
      removeContactInfoUseCase.execute({ businessId, contactInfoId }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: contactInfoKeys.byBusiness(businessId) }),
  });
}

export function useUpdateContactInfo(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      contactInfoId,
      type,
      value,
      label,
    }: {
      contactInfoId: string;
      type: ContactInfoType;
      value: string;
      label?: string;
    }) => updateContactInfoUseCase.execute({ businessId, contactInfoId, type, value, label }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: contactInfoKeys.byBusiness(businessId) }),
  });
}
