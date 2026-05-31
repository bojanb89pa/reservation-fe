import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type {
  CreateBusinessCategoryCommand,
  UpdateBusinessCategoryCommand,
  UpdateBusinessCategoryAppearanceCommand,
} from '@domain';
import {
  listBusinessCategoriesUseCase,
  createBusinessCategoryUseCase,
  updateBusinessCategoryUseCase,
  updateBusinessCategoryAppearanceUseCase,
  deleteBusinessCategoryUseCase,
} from '../app/container';

export const categoryKeys = {
  all: ['business-categories'] as const,
  list: (locale: string) => ['business-categories', 'list', locale] as const,
};

export function useBusinessCategories() {
  const { i18n } = useTranslation();
  const locale = i18n.language;
  return useQuery({
    queryKey: categoryKeys.list(locale),
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

export function useUpdateBusinessCategoryAppearance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; command: UpdateBusinessCategoryAppearanceCommand }) =>
      updateBusinessCategoryAppearanceUseCase.execute(args.id, args.command),
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
