import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UserSummary } from '@domain';
import { useUserSearch } from '../../hooks/useUserSearch';
import styles from './UserAutocompleteInput.module.css';

// Joins only the name parts that are present; falls back to the email when both are empty.
function displayName(user: UserSummary): string {
  const name = [user.firstName, user.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
  return name || user.email;
}

interface Props {
  selectedUser: UserSummary | null;
  onSelect: (user: UserSummary) => void;
  onClear: () => void;
  placeholder: string;
  onQueryChange?: (query: string) => void;
  disabled?: boolean;
}

export function UserAutocompleteInput({
  selectedUser,
  onSelect,
  onClear,
  placeholder,
  onQueryChange,
  disabled,
}: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const { data: suggestions = [], isFetching: isSearching } = useUserSearch(query);

  const handleSelect = (user: UserSummary) => {
    onSelect(user);
    setQuery('');
    onQueryChange?.('');
  };

  if (selectedUser) {
    return (
      <div className={styles.selectedUser}>
        <div className={styles.selectedUserInfo}>
          <span className={styles.selectedUserName}>
            {displayName(selectedUser)}
          </span>
          {displayName(selectedUser) !== selectedUser.email && (
            <span className={styles.selectedUserEmail}>{selectedUser.email}</span>
          )}
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
        aria-label={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onQueryChange?.(e.target.value);
        }}
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
                  {displayName(user)}
                </span>
                {displayName(user) !== user.email && (
                  <span className={styles.suggestionEmail}>{user.email}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
