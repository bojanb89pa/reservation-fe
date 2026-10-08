import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { BusinessCategory } from '@domain';
import { CategoryForm } from '../CategoryForm';
import '../../../i18n';

const category: BusinessCategory = {
  id: 'cat-1',
  name: 'Hair salon',
  parentId: null,
  symbol: null,
  color: null,
};

describe('CategoryForm', () => {
  it('omits the code field when editing an existing category', () => {
    render(
      <CategoryForm
        categories={[category]}
        initial={category}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        isPending={false}
      />,
    );

    // only the two translation inputs (en, sr) remain
    expect(screen.getAllByRole('textbox')).toHaveLength(2);
  });

  it('saves an edit without code and with a null parent', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <CategoryForm
        categories={[category]}
        initial={category}
        onSave={onSave}
        onCancel={vi.fn()}
        isPending={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /sačuvaj izmene|save changes/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const [code, translations, parentId] = onSave.mock.calls[0];
    expect(code).toBeUndefined();
    expect(Object.values(translations)).toEqual(['Hair salon']);
    expect(parentId).toBeNull();
  });
});
