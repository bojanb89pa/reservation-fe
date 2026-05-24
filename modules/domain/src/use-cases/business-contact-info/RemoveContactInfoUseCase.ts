import type {
  BusinessContactInfo,
  RemoveContactInfoCommand,
} from '../../entities/BusinessContactInfo';

export interface RemoveContactInfoUseCase {
  execute(command: RemoveContactInfoCommand): Promise<BusinessContactInfo>;
}
