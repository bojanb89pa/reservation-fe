import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllBusinessesUseCase,
  searchBusinessesUseCase,
  getBusinessUseCase,
  createBusinessUseCase,
} from '../app/container';

export const businessKeys = {
  all: ['businesses'] as const,
  list: (page: number, size: number) => ['businesses', 'list', page, size] as const,
  search: (query: string, page: number, size: number) => ['businesses', 'search', query, page, size] as const,
  detail: (id: string) => ['businesses', 'detail', id] as const,
};

export function useBusinesses(page = 0, size = 20) {
  return useQuery({
    queryKey: businessKeys.list(page, size),
    queryFn: () => getAllBusinessesUseCase.execute({ page, size }),
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

export function useCreateBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createBusinessUseCase.execute({ name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: businessKeys.all }),
  });
}
