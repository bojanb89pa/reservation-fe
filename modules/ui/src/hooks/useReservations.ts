import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateReservationCommand } from '@domain';
import {
  createReservationUseCase,
  getAllReservationsUseCase,
  getReservationUseCase,
  approveReservationUseCase,
  rejectReservationUseCase,
  cancelReservationUseCase,
} from '../app/container';

export function useGetAllReservations() {
  return useQuery({
    queryKey: ['reservations'],
    queryFn: () => getAllReservationsUseCase.execute(),
  });
}

export function useCreateReservation(resourceId: string) {
  return useMutation({
    mutationFn: (command: CreateReservationCommand) =>
      createReservationUseCase.execute(resourceId, command),
  });
}

export function useGetReservation(id: string) {
  return useQuery({
    queryKey: ['reservations', id],
    queryFn: () => getReservationUseCase.execute(id),
    enabled: !!id,
  });
}

export function useApproveReservation() {
  return useMutation({
    mutationFn: ({ resourceId, id }: { resourceId: string; id: string }) =>
      approveReservationUseCase.execute(resourceId, id),
  });
}

export function useRejectReservation() {
  return useMutation({
    mutationFn: ({ resourceId, id }: { resourceId: string; id: string }) =>
      rejectReservationUseCase.execute(resourceId, id),
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ resourceId, id }: { resourceId: string; id: string }) =>
      cancelReservationUseCase.execute(resourceId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
}
