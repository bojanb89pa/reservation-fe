import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SlotGrid } from '../SlotGrid';

describe('SlotGrid', () => {
  const slots = ['9:00', '9:45', '10:30'];

  it('renders all slots', () => {
    render(<SlotGrid slots={slots} selected={null} onSelect={vi.fn()} />);
    expect(screen.getByText('9:00')).toBeInTheDocument();
    expect(screen.getByText('9:45')).toBeInTheDocument();
    expect(screen.getByText('10:30')).toBeInTheDocument();
  });

  it('calls onSelect when an available slot is clicked', () => {
    const onSelect = vi.fn();
    render(<SlotGrid slots={slots} selected={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('9:45'));
    expect(onSelect).toHaveBeenCalledWith('9:45');
  });

  it('does not call onSelect for taken slots', () => {
    const onSelect = vi.fn();
    render(
      <SlotGrid slots={slots} takenSlots={new Set(['9:00'])} selected={null} onSelect={onSelect} />,
    );
    const takenBtn = screen.getByText('9:00').closest('button')!;
    expect(takenBtn).toBeDisabled();
  });

  it('highlights the selected slot', () => {
    const { container } = render(<SlotGrid slots={slots} selected="10:30" onSelect={vi.fn()} />);
    const selected =
      container.querySelector('button.selected') ??
      Array.from(container.querySelectorAll('button')).find((b) =>
        b.className.includes('selected'),
      );
    expect(selected?.textContent).toBe('10:30');
  });
});
