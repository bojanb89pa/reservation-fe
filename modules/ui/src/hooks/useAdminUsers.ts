import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  AdminUserSearchFilter,
  PageRequest,
  AdminCreateUserCommand,
  AdminUpdateUserCommand,
  UpdateUserStatusCommand,
  ResetUserPasswordCommand,
} from '@domain';
import {
  searchUsersForAdminUseCase,
  getUserByIdForAdminUseCase,
  createUserByAdminUseCase,
  updateUserByAdminUseCase,
  updateUserStatusUseCase,
  resetUserPasswordUseCase,
  deleteUserByAdminUseCase,
} from '../app/container';

export const adminUserKeys = {
  all: ['admin-users'] as const,
  list: (filter: AdminUserSearchFilter, pageRequest: PageRequest) =>
    ['admin-users', 'list', filter, pageRequest] as const,
  detail: (id: string) => ['admin-users', 'detail', id] as const,
};

export function useAdminUsersSearch(filter: AdminUserSearchFilter, pageRequest: PageRequest) {
  return useQuery({
    queryKey: adminUserKeys.list(filter, pageRequest),
    queryFn: () => searchUsersForAdminUseCase.execute(filter, pageRequest),
  });
}

export function useAdminUserById(id: string | undefined) {
  return useQuery({
    queryKey: adminUserKeys.detail(id ?? ''),
    queryFn: () => getUserByIdForAdminUseCase.execute(id!),
    enabled: !!id,
  });
}

export function useCreateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: AdminCreateUserCommand) => createUserByAdminUseCase.execute(command),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminUserKeys.all }),
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; command: AdminUpdateUserCommand }) =>
      updateUserByAdminUseCase.execute(args.id, args.command),
    onSuccess: (_, args) => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.all });
      queryClient.invalidateQueries({ queryKey: adminUserKeys.detail(args.id) });
    },
  });
}

export function useUpdateAdminUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; command: UpdateUserStatusCommand }) =>
      updateUserStatusUseCase.execute(args.id, args.command),
    onSuccess: (_, args) => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.all });
      queryClient.invalidateQueries({ queryKey: adminUserKeys.detail(args.id) });
    },
  });
}

export function useResetAdminUserPassword() {
  return useMutation({
    mutationFn: (args: { id: string; command: ResetUserPasswordCommand }) =>
      resetUserPasswordUseCase.execute(args.id, args.command),
  });
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUserByAdminUseCase.execute(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminUserKeys.all }),
  });
}
