import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BusinessImage } from '../BusinessImage';
import '../../../i18n';

describe('BusinessImage', () => {
  it('uses the relative path straight as the src, without prefixing a host', () => {
    render(<BusinessImage name="Maison Kohl" imageUrl="/api/businesses/abc/image" seed="abc" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/api/businesses/abc/image');
  });

  it('renders the initials placeholder instead of an image when there is none', () => {
    const { container } = render(<BusinessImage name="Maison Kohl" imageUrl={null} seed="abc" />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('MK')).toBeInTheDocument();
  });

  it('renders overlay content above the image', () => {
    render(
      <BusinessImage name="Maison Kohl" imageUrl={null} seed="abc">
        <h3>Maison Kohl</h3>
      </BusinessImage>,
    );
    expect(screen.getByRole('heading', { name: 'Maison Kohl' })).toBeInTheDocument();
  });
});
