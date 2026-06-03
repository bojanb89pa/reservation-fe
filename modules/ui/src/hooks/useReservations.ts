import { useMutation, useQuery } from '@tanstack/react-query';
import type { CreateReservationCommand } from '@domain';
import {
  createReservationUseCase,
  getReservationUseCase,
  approveReservationUseCase,
  rejectReservationUseCase,
} from '../app/container';

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
