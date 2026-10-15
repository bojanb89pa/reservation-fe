import { useMutation } from '@tanstack/react-query';
import type { CreateClientApplicationCommand } from '@fe/domain';
import { registerClientApplicationUseCase } from '../app/container';

export function useCreateClientApplication() {
  return useMutation({
    mutationFn: (command: CreateClientApplicationCommand) =>
      registerClientApplicationUseCase.execute(command),
  });
}
