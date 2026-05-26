import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateBusinessCategoryCommand, UpdateBusinessCategoryCommand } from '@domain';
import {
  listBusinessCategoriesUseCase,
  createBusinessCategoryUseCase,
  updateBusinessCategoryUseCase,
  deleteBusinessCategoryUseCase,
} from '../app/container';

export const categoryKeys = {
  all: ['business-categories'] as const,
  list: () => ['business-categories', 'list'] as const,
};

export function useBusinessCategories() {
  return useQuery({
    queryKey: categoryKeys.list(),
    queryFn: () => listBusinessCategoriesUseCase.execute(),
  });
}

export function useCreateBusinessCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: CreateBusinessCategoryCommand) =>
      createBusinessCategoryUseCase.execute(command),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}

export function useUpdateBusinessCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; command: UpdateBusinessCategoryCommand }) =>
      updateBusinessCategoryUseCase.execute(args.id, args.command),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}

export function useDeleteBusinessCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBusinessCategoryUseCase.execute(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}
