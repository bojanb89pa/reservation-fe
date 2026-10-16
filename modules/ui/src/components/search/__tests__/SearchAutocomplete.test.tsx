import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const execute = vi.hoisted(() => vi.fn());

vi.mock('../../../app/container', () => ({
  getSearchSuggestionsUseCase: { execute },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

import { SearchAutocomplete } from '../SearchAutocomplete';

const suggestions = [
  { type: 'PLACE', id: 'Novi Sad', name: 'Novi Sad' },
  { type: 'PLACE', id: 'Niš', name: 'Niš' },
  { type: 'CATEGORY', id: 'cat-uuid', name: 'Frizeri' },
  { type: 'BUSINESS', id: 'biz-uuid', name: 'Salon Ana' },
];

function Location() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname + loc.search}</div>;
}

function Harness({ onSubmit = vi.fn() }: { onSubmit?: () => void }) {
  const [value, setValue] = useState('');
  return <SearchAutocomplete label="What" value={value} onChange={setValue} onSubmit={onSubmit} />;
}

function renderIt(onSubmit?: () => void) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Routes>
          <Route path="*" element={<Harness onSubmit={onSubmit} />} />
        </Routes>
        <Location />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SearchAutocomplete', () => {
  beforeEach(() => {
    execute.mockReset();
    execute.mockResolvedValue(suggestions);
  });

  it('renders groups in arrival order and keeps server order of options', async () => {
    const user = userEvent.setup();
    renderIt();
    await user.type(screen.getByRole('combobox', { name: 'What' }), 'n');

    const listbox = await screen.findByRole('listbox', { name: 'searchAutocomplete.listLabel' });
    const groups = within(listbox).getAllByRole('group');
    expect(groups.map((g) => g.getAttribute('aria-labelledby'))).toHaveLength(3);
    expect(groups[0]).toHaveTextContent('searchAutocomplete.groupPLACE');
    expect(groups[1]).toHaveTextContent('searchAutocomplete.groupCATEGORY');
    expect(groups[2]).toHaveTextContent('searchAutocomplete.groupBUSINESS');
    expect(
      within(listbox)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Novi Sad', 'Niš', 'Frizeri', 'Salon Ana']);
  });

  it('navigates to search with q and city for a PLACE', async () => {
    const user = userEvent.setup();
    renderIt();
    await user.type(screen.getByRole('combobox', { name: 'What' }), 'sal');
    await user.click(await screen.findByRole('option', { name: 'Novi Sad' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/search?q=sal&city=Novi+Sad');
  });

  it('navigates to the category route for a CATEGORY', async () => {
    const user = userEvent.setup();
    renderIt();
    await user.type(screen.getByRole('combobox', { name: 'What' }), 'fr');
    await user.click(await screen.findByRole('option', { name: 'Frizeri' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/businesses/category/cat-uuid');
  });

  it('navigates to the business detail for a BUSINESS via keyboard', async () => {
    const user = userEvent.setup();
    renderIt();
    const input = screen.getByRole('combobox', { name: 'What' });
    await user.type(input, 'sal');
    await screen.findByRole('option', { name: 'Salon Ana' });
    await user.keyboard('{ArrowUp}{Enter}');
    expect(screen.getByTestId('location')).toHaveTextContent('/businesses/biz-uuid');
  });

  it('calls onSubmit on Enter when no option is highlighted', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderIt(onSubmit);
    await user.type(screen.getByRole('combobox', { name: 'What' }), 'sal{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state', async () => {
    execute.mockResolvedValue([]);
    const user = userEvent.setup();
    renderIt();
    await user.type(screen.getByRole('combobox', { name: 'What' }), 'zzz');
    expect(await screen.findByText('searchAutocomplete.empty')).toBeInTheDocument();
  });

  it('shows the error state', async () => {
    execute.mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();
    renderIt();
    await user.type(screen.getByRole('combobox', { name: 'What' }), 'zzz');
    expect(await screen.findByText('searchAutocomplete.error')).toBeInTheDocument();
  });

  it('does not call the use case for blank input', async () => {
    const user = userEvent.setup();
    renderIt();
    await user.type(screen.getByRole('combobox', { name: 'What' }), '   ');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(execute).not.toHaveBeenCalled();
  });
});
