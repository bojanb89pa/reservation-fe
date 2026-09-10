import type { Business } from '../../entities/Business';

export interface SetBusinessImageUseCase {
  execute(id: string, uploadId: string): Promise<Business>;
}
