import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { User, Role } from '@domain';
import styles from './UserForm.module.css';

const ALL_ROLES: Role[] = ['ROLE_USER', 'ROLE_ADMIN'];

export interface UserFormValues {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  roles: Role[];
}

interface Props {
  initial?: User;
  onSave: (values: UserFormValues) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
  error?: string | null;
}

export function UserForm({ initial, onSave, onCancel, isPending, error }: Props) {
  const { t } = useTranslation();
  const isEdit = !!initial;

  const [email, setEmail] = useState(initial?.email ?? '');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState(initial?.firstName ?? '');
  const [lastName, setLastName] = useState(initial?.lastName ?? '');
  const [roles, setRoles] = useState<Role[]>(initial?.roles ?? []);
  const [rolesTouched, setRolesTouched] = useState(false);

  useEffect(() => {
    setEmail(initial?.email ?? '');
    setPassword('');
    setFirstName(initial?.firstName ?? '');
    setLastName(initial?.lastName ?? '');
    setRoles(initial?.roles ?? []);
    setRolesTouched(false);
  }, [initial]);

  const toggleRole = (role: Role) => {
    setRolesTouched(true);
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  };

  const rolesInvalid = rolesTouched && roles.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRolesTouched(true);
    if (!email.trim() || !firstName.trim() || !lastName.trim() || roles.length === 0) return;
    if (!isEdit && !password) return;
    await onSave({
      email: email.trim(),
      password: isEdit ? undefined : password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      roles,
    });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <div className="error-box">{error}</div>}

      <div className="form-field">
        <label className="form-label">{t('userForm.emailLabel')}</label>
        <input
          type="email"
          className="form-input"
          placeholder={t('userForm.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
      </div>

      {!isEdit && (
        <div className="form-field">
          <label className="form-label">{t('userForm.passwordLabel')}</label>
          <input
            type="password"
            className="form-input"
            placeholder={t('userForm.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
      )}

      <div className="form-field">
        <label className="form-label">{t('userForm.firstNameLabel')}</label>
        <input
          className="form-input"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
        />
      </div>

      <div className="form-field">
        <label className="form-label">{t('userForm.lastNameLabel')}</label>
        <input
          className="form-input"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />
      </div>

      <div className="form-field">
        <label className="form-label">{t('userForm.rolesLabel')}</label>
        <div className={styles.rolesRow}>
          {ALL_ROLES.map((role) => (
            <label key={role} className={styles.roleCheckbox}>
              <input
                type="checkbox"
                checked={roles.includes(role)}
                onChange={() => toggleRole(role)}
              />
              {t(`roleLabel.${role}`)}
            </label>
          ))}
        </div>
        {rolesInvalid && <div className="form-error">{t('userForm.rolesRequired')}</div>}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onCancel}
          disabled={isPending}
        >
          {t('userForm.cancel')}
        </button>
        <button type="submit" className="btn btn-secondary btn-sm" disabled={isPending}>
          {isPending
            ? t('userForm.saving')
            : isEdit
              ? t('userForm.saveChanges')
              : t('userForm.createUser')}
        </button>
      </div>
    </form>
  );
}
