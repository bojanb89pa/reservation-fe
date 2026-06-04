import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BusinessSearchFilter, CreateBusinessLocationCommand } from '@domain';
import {
  getMyBusinessesUseCase,
  searchBusinessesUseCase,
  getBusinessUseCase,
  submitBusinessUseCase,
  createBusinessByAdminUseCase,
  setBusinessCategoryUseCase,
  getBusinessesByCategoryUseCase,
} from '../app/container';
import { useAuthStore } from '../state/authStore';

export function useHasBusinessMembership(): boolean {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data } = useQuery({
    queryKey: ['businesses', 'my', 'membership-check'] as const,
    queryFn: () => getMyBusinessesUseCase.execute({ page: 0, size: 1 }),
    enabled: isAuthenticated,
  });
  return (data?.totalElements ?? 0) > 0;
}

export function useHasActiveBusiness(): boolean {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data } = useQuery({
    queryKey: ['businesses', 'my', 'active-check'] as const,
    queryFn: () => getMyBusinessesUseCase.execute({ page: 0, size: 50 }),
    enabled: isAuthenticated,
  });
  return (data?.content ?? []).some((b) => b.status === 'ACTIVE');
}

export const businessKeys = {
  all: ['businesses'] as const,
  mine: (page: number, size: number) => ['businesses', 'my', page, size] as const,
  search: (filter: BusinessSearchFilter, page: number, size: number) =>
    ['businesses', 'search', filter.query ?? '', filter.categoryIds ?? [], page, size] as const,
  detail: (id: string) => ['businesses', 'detail', id] as const,
  byCategory: (categoryId: string, page: number, size: number) =>
    ['businesses', 'category', categoryId, page, size] as const,
};

export function useMyBusinesses(page = 0, size = 20) {
  return useQuery({
    queryKey: businessKeys.mine(page, size),
    queryFn: () => getMyBusinessesUseCase.execute({ page, size }),
  });
}

export function useSearchBusinesses(filter: BusinessSearchFilter, page = 0, size = 12) {
  return useQuery({
    queryKey: businessKeys.search(filter, page, size),
    queryFn: () => searchBusinessesUseCase.execute(filter, { page, size }),
  });
}

export function useBusinessesByCategory(categoryId: string, page = 0, size = 12) {
  return useQuery({
    queryKey: businessKeys.byCategory(categoryId, page, size),
    queryFn: () => getBusinessesByCategoryUseCase.execute(categoryId, { page, size }),
    enabled: !!categoryId,
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
    mutationFn: ({
      name,
      location,
    }: {
      name: string;
      location: CreateBusinessLocationCommand;
    }) => {
      if (!session) throw new Error('Not authenticated');
      const payload = JSON.parse(atob(session.accessToken.split('.')[1])) as Record<
        string,
        unknown
      >;
      const roles = (payload['roles'] ?? payload['authorities'] ?? []) as string[];
      if (roles.includes('ROLE_ADMIN')) {
        return createBusinessByAdminUseCase.execute({
          name,
          ownerId: payload['sub'] as string,
          location,
        });
      }
      return submitBusinessUseCase.execute({ name, location });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: businessKeys.all }),
  });
}
