import type {
  BusinessContactInfo,
  UpdateContactInfoCommand,
} from '../../entities/BusinessContactInfo';

export interface UpdateContactInfoUseCase {
  execute(command: UpdateContactInfoCommand): Promise<BusinessContactInfo>;
}
