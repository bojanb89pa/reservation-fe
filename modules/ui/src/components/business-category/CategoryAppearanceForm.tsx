import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { BusinessCategory } from '@domain';
import { DEFAULT_CATEGORY_SYMBOL, DEFAULT_CATEGORY_COLOR } from '@domain';
import styles from './CategoryAppearanceForm.module.css';

interface Props {
  category: BusinessCategory;
  onSave: (symbol: string | null, color: string | null) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
  error?: string | null;
}

export function CategoryAppearanceForm({ category, onSave, onCancel, isPending, error }: Props) {
  const { t } = useTranslation();
  const [symbol, setSymbol] = useState(category.symbol ?? '');
  const [color, setColor] = useState(category.color ?? DEFAULT_CATEGORY_COLOR);

  useEffect(() => {
    setSymbol(category.symbol ?? '');
    setColor(category.color ?? DEFAULT_CATEGORY_COLOR);
  }, [category.id, category.symbol, category.color]);

  const previewSymbol = symbol.trim() || DEFAULT_CATEGORY_SYMBOL;
  const previewColor = color || DEFAULT_CATEGORY_COLOR;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(symbol.trim() || null, color || null);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <div className="error-box">{error}</div>}

      <div className={styles.fields}>
        <div className="form-field">
          <label className="form-label">{t('categoryAppearanceForm.symbolLabel')}</label>
          <input
            className="form-input"
            placeholder={t('categoryAppearanceForm.symbolPlaceholder')}
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            maxLength={5}
            autoFocus
          />
        </div>

        <div className="form-field">
          <label className="form-label">{t('categoryAppearanceForm.colorLabel')}</label>
          <div className={styles.colorRow}>
            <input
              type="color"
              className={styles.colorPicker}
              value={color}
              onChange={(e) => setColor(e.target.value)}
              aria-label={t('categoryAppearanceForm.colorLabel')}
            />
            <input
              className="form-input"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#6B7280"
              maxLength={20}
            />
          </div>
        </div>
      </div>

      <div className={styles.preview}>
        <span className={styles.previewLabel}>{t('categoryAppearanceForm.preview')}</span>
        <div
          className={styles.previewChip}
          style={{ background: `${previewColor}1A`, color: previewColor }}
        >
          {previewSymbol}
        </div>
        <span className={styles.previewName}>{category.name}</span>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onCancel}
          disabled={isPending}
        >
          {t('categoryAppearanceForm.cancel')}
        </button>
        <button type="submit" className="btn btn-secondary btn-sm" disabled={isPending}>
          {isPending ? t('categoryAppearanceForm.saving') : t('categoryAppearanceForm.save')}
        </button>
      </div>
    </form>
  );
}
