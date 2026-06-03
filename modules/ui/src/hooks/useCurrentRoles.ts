import { useAuthStore } from '../state/authStore';

function parseJwtClaims(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return {};
  }
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'string') return value.split(' ').filter(Boolean);
  return [];
}

export function useCurrentRoles(): string[] {
  const session = useAuthStore((s) => s.session);
  if (!session) return [];
  const claims = parseJwtClaims(session.accessToken);
  return [
    ...toStringArray(claims['authorities']),
    ...toStringArray(claims['roles']),
  ];
}

export function useIsAdmin(): boolean {
  return useCurrentRoles().includes('ROLE_ADMIN');
}

export function useIsEmployee(): boolean {
  const roles = useCurrentRoles();
  return roles.some((r) => r === 'ROLE_EMPLOYEE' || r === 'EMPLOYEE');
}
