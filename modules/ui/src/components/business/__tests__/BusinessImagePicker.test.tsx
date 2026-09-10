import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ALLOWED_BUSINESS_IMAGE_CONTENT_TYPES } from '@domain';
import { BusinessImagePicker } from '../BusinessImagePicker';
import '../../../i18n';

describe('BusinessImagePicker', () => {
  // jsdom ships no object URLs; the preview only needs a stable string.
  beforeAll(() => {
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  const fileInput = (container: HTMLElement) =>
    container.querySelector('input[type="file"]') as HTMLInputElement;

  it('accepts exactly the content types the domain allows', () => {
    const { container } = render(<BusinessImagePicker file={null} onChange={vi.fn()} />);
    expect(fileInput(container).accept).toBe(ALLOWED_BUSINESS_IMAGE_CONTENT_TYPES.join(','));
  });

  it('states the format and size limit', () => {
    render(<BusinessImagePicker file={null} onChange={vi.fn()} />);
    expect(screen.getByText(/JPEG, PNG, WebP/)).toBeInTheDocument();
    expect(screen.getByText(/5 MB/)).toBeInTheDocument();
  });

  it('reports the chosen file to the parent', () => {
    const onChange = vi.fn();
    const { container } = render(<BusinessImagePicker file={null} onChange={onChange} />);
    const file = new File(['x'], 'cover.png', { type: 'image/png' });
    fireEvent.change(fileInput(container), { target: { files: [file] } });
    expect(onChange).toHaveBeenCalledWith(file);
  });

  it('clears the selection without validating anything', () => {
    const onChange = vi.fn();
    const file = new File(['x'], 'cover.png', { type: 'image/png' });
    render(<BusinessImagePicker file={file} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
