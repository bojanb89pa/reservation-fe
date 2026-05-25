import type { Business, SubmitBusinessCommand } from '../../entities/Business';

export interface SubmitBusinessUseCase {
  execute(command: SubmitBusinessCommand): Promise<Business>;
}
