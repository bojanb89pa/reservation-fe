import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { BusinessCategory } from '@domain';
import styles from './CategoryForm.module.css';

const SUPPORTED_LOCALES = ['en', 'sr'] as const;

interface Props {
  categories: BusinessCategory[];
  initial?: BusinessCategory;
  onSave: (
    code: string | undefined,
    translations: Record<string, string>,
    parentId: string | null,
  ) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
  error?: string | null;
}

export function CategoryForm({ categories, initial, onSave, onCancel, isPending, error }: Props) {
  const { t, i18n } = useTranslation();
  const isEdit = !!initial;

  const [code, setCode] = useState('');
  const [translations, setTranslations] = useState<Record<string, string>>(() => {
    if (initial) {
      return { [i18n.language]: initial.name };
    }
    return {};
  });
  const [parentId, setParentId] = useState<string>(initial?.parentId ?? '');

  useEffect(() => {
    setCode('');
    setTranslations(initial ? { [i18n.language]: initial.name } : {});
    setParentId(initial?.parentId ?? '');
  }, [initial, i18n.language]);

  const topLevel = categories.filter((c) => c.parentId === null && c.id !== initial?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nonEmpty = Object.fromEntries(
      Object.entries(translations).filter(([, v]) => v.trim() !== ''),
    );
    if (Object.keys(nonEmpty).length === 0) return;
    await onSave(code.trim() || undefined, nonEmpty, parentId || null);
  };

  const setTranslation = (locale: string, value: string) => {
    setTranslations((prev) => ({ ...prev, [locale]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <div className="error-box">{error}</div>}

      <div className="form-field">
        <label className="form-label">
          {t('categoryForm.codeLabel')}
          {isEdit && <span className={styles.optional}> {t('categoryForm.codeOptional')}</span>}
        </label>
        <input
          className="form-input"
          placeholder={t('categoryForm.codePlaceholder')}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required={!isEdit}
          autoFocus={!isEdit}
        />
      </div>

      <fieldset className={styles.translationsFieldset}>
        <legend className={styles.translationsLegend}>{t('categoryForm.translationsLabel')}</legend>
        {SUPPORTED_LOCALES.map((locale) => (
          <div key={locale} className="form-field">
            <label className="form-label">{t(`categoryForm.locale_${locale}`)}</label>
            <input
              className="form-input"
              placeholder={t('categoryForm.translationPlaceholder')}
              value={translations[locale] ?? ''}
              onChange={(e) => setTranslation(locale, e.target.value)}
              autoFocus={isEdit && locale === i18n.language}
            />
          </div>
        ))}
      </fieldset>

      <div className="form-field">
        <label className="form-label">{t('categoryForm.parentLabel')}</label>
        <select
          className="form-input"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
        >
          <option value="">{t('categoryForm.topLevel')}</option>
          {topLevel.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onCancel}
          disabled={isPending}
        >
          {t('categoryForm.cancel')}
        </button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
          {isPending
            ? t('categoryForm.saving')
            : initial
              ? t('categoryForm.saveChanges')
              : t('categoryForm.createCategory')}
        </button>
      </div>
    </form>
  );
}
