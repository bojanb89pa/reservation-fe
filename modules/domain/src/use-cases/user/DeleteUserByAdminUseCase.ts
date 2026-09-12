export interface DeleteUserByAdminUseCase {
  execute(id: string): Promise<void>;
}
