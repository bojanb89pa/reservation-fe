import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UserSummary } from '@domain';
import { useUserSearch } from '../../hooks/useUserSearch';
import styles from './UserAutocompleteInput.module.css';

interface Props {
  selectedUser: UserSummary | null;
  onSelect: (user: UserSummary) => void;
  onClear: () => void;
  placeholder: string;
  disabled?: boolean;
}

export function UserAutocompleteInput({
  selectedUser,
  onSelect,
  onClear,
  placeholder,
  disabled,
}: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const { data: suggestions = [], isFetching: isSearching } = useUserSearch(query);

  const handleSelect = (user: UserSummary) => {
    onSelect(user);
    setQuery('');
  };

  if (selectedUser) {
    return (
      <div className={styles.selectedUser}>
        <div className={styles.selectedUserInfo}>
          <span className={styles.selectedUserName}>
            {selectedUser.firstName} {selectedUser.lastName}
          </span>
          <span className={styles.selectedUserEmail}>{selectedUser.email}</span>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>
          {t('memberSection.changeUser')}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.searchWrapper}>
      <input
        className="form-input"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={disabled}
      />
      {isSearching && query.trim().length >= 2 && (
        <div className={styles.searchHint}>{t('memberSection.searching')}</div>
      )}
      {suggestions.length > 0 && (
        <ul className={styles.suggestionList}>
          {suggestions.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                className={styles.suggestionButton}
                onClick={() => handleSelect(user)}
              >
                <span className={styles.suggestionName}>
                  {user.firstName} {user.lastName}
                </span>
                <span className={styles.suggestionEmail}>{user.email}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
