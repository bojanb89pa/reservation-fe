import { useMutation } from '@tanstack/react-query';
import { createReservationUseCase } from '../app/container';
import type { CreateReservationCommand } from '@domain/entities/Reservation';

export function useCreateReservation(resourceId: string) {
  return useMutation({
    mutationFn: (command: CreateReservationCommand) =>
      createReservationUseCase.execute(resourceId, command),
  });
}
