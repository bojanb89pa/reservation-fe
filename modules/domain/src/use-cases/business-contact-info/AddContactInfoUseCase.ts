import type {
  BusinessContactInfo,
  AddContactInfoCommand,
} from '../../entities/BusinessContactInfo';

export interface AddContactInfoUseCase {
  execute(command: AddContactInfoCommand): Promise<BusinessContactInfo>;
}
