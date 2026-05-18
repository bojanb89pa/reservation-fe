import type { Role } from './Role';

export interface User {
  id: string | null;
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  enabled: boolean | null;
}

export interface UserRegistration {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}
