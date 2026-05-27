import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyBusinessesUseCase,
  searchBusinessesUseCase,
  getBusinessUseCase,
  submitBusinessUseCase,
  createBusinessByAdminUseCase,
  setBusinessCategoryUseCase,
} from '../app/container';
import { useAuthStore } from '../state/authStore';

export const businessKeys = {
  all: ['businesses'] as const,
  mine: (page: number, size: number) => ['businesses', 'my', page, size] as const,
  search: (query: string, page: number, size: number) =>
    ['businesses', 'search', query, page, size] as const,
  detail: (id: string) => ['businesses', 'detail', id] as const,
};

export function useMyBusinesses(page = 0, size = 20) {
  return useQuery({
    queryKey: businessKeys.mine(page, size),
    queryFn: () => getMyBusinessesUseCase.execute({ page, size }),
  });
}

export function useSearchBusinesses(query: string, page = 0, size = 12) {
  return useQuery({
    queryKey: businessKeys.search(query, page, size),
    queryFn: () => searchBusinessesUseCase.execute(query, { page, size }),
  });
}

export function useBusiness(id: string) {
  return useQuery({
    queryKey: businessKeys.detail(id),
    queryFn: () => getBusinessUseCase.execute(id),
    enabled: !!id,
  });
}

export function useSetBusinessCategory(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string | null) =>
      setBusinessCategoryUseCase.execute(businessId, categoryId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: businessKeys.detail(businessId) }),
  });
}

export function useCreateBusiness() {
  const queryClient = useQueryClient();
  const { session } = useAuthStore();

  return useMutation({
    mutationFn: (name: string) => {
      if (!session) throw new Error('Not authenticated');
      const payload = JSON.parse(atob(session.accessToken.split('.')[1])) as Record<
        string,
        unknown
      >;
      const roles = (payload['roles'] ?? payload['authorities'] ?? []) as string[];
      if (roles.includes('ROLE_ADMIN')) {
        return createBusinessByAdminUseCase.execute({ name, ownerId: payload['sub'] as string });
      }
      return submitBusinessUseCase.execute({ name });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: businessKeys.all }),
  });
}
