import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import type { User, PageResponse } from '@domain';
import { DashboardUsersPage } from '../DashboardUsersPage';
import '../../../i18n';

const mockUseAdminUsersSearch = vi.fn();
const mockCreateUser = vi.fn();
const mockUpdateUser = vi.fn();
const mockUpdateStatus = vi.fn();
const mockResetPassword = vi.fn();
const mockDeleteUser = vi.fn();
const mockUseAdminUserMessages = vi.fn();

vi.mock('../../../hooks/useAdminUsers', () => ({
  useAdminUsersSearch: (...args: unknown[]) => mockUseAdminUsersSearch(...args),
  useCreateAdminUser: () => ({ mutateAsync: mockCreateUser, isPending: false }),
  useUpdateAdminUser: () => ({ mutateAsync: mockUpdateUser, isPending: false }),
  useUpdateAdminUserStatus: () => ({ mutateAsync: mockUpdateStatus, isPending: false }),
  useResetAdminUserPassword: () => ({ mutateAsync: mockResetPassword, isPending: false }),
  useDeleteAdminUser: () => ({ mutateAsync: mockDeleteUser, isPending: false }),
}));

vi.mock('../../../hooks/useAdminUserMessages', () => ({
  useAdminUserMessages: () => ({
    errorMessage: mockUseAdminUserMessages,
  }),
}));

const mockUser: User = {
  id: 'u1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  status: 'ACTIVE' as const,
  roles: ['ROLE_USER'],
  enabled: true,
  profilePictureUrl: null,
};

const mockPage: PageResponse<User> = {
  content: [mockUser],
  totalElements: 1,
  totalPages: 1,
  page: 0,
  size: 10,
  nextCursor: null,
  prevCursor: null,
  hasNext: null,
  hasPrevious: null,
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </BrowserRouter>,
  );
}

describe('DashboardUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdminUserMessages.mockReturnValue('Test error');
  });

  it('renders the users page with initial data', () => {
    mockUseAdminUsersSearch.mockReturnValue({
      data: mockPage,
      isLoading: false,
    });

    renderWithProviders(<DashboardUsersPage />);

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('keeps page at 2 after search completes and user clicks next', async () => {
    // Initially return 20 users so pagination is available
    const initialPage: PageResponse<User> = {
      content: Array.from({ length: 10 }, (_, i) => ({
        ...mockUser,
        id: `u${i}`,
        firstName: `User${i}`,
      })),
      totalElements: 20,
      totalPages: 2,
      page: 0,
      size: 10,
      nextCursor: null,
      prevCursor: null,
      hasNext: true,
      hasPrevious: false,
    };

    mockUseAdminUsersSearch.mockReturnValue({
      data: initialPage,
      isLoading: false,
    });

    renderWithProviders(<DashboardUsersPage />);

    // Type in search input to filter results
    const searchInput = screen.getByPlaceholderText(/search/i) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'test' } });

    // Mock the response after search - same total elements, still 2 pages
    const searchResultPage: PageResponse<User> = {
      ...initialPage,
      totalElements: 20,
      totalPages: 2,
      page: 0,
      content: Array.from({ length: 10 }, (_, i) => ({
        ...mockUser,
        id: `search-${i}`,
        firstName: `SearchResult${i}`,
      })),
      hasNext: true,
      hasPrevious: false,
    };
    mockUseAdminUsersSearch.mockReturnValue({
      data: searchResultPage,
      isLoading: false,
    });

    // Wait for debounce to complete
    await waitFor(
      () => {
        expect(searchInput.value).toBe('test');
      },
      { timeout: 500 },
    );

    // Now user clicks Next to go to page 2
    const nextButton = screen.getAllByRole('button').find((btn) =>
      btn.textContent?.includes('Next'),
    );
    expect(nextButton).toBeInTheDocument();
    fireEvent.click(nextButton!);

    // Mock page 2 response
    const page2Response: PageResponse<User> = {
      ...searchResultPage,
      page: 1,
      content: Array.from({ length: 10 }, (_, i) => ({
        ...mockUser,
        id: `search-${i + 10}`,
        firstName: `SearchResult${i + 10}`,
      })),
      hasPrevious: true,
      hasNext: false,
    };

    mockUseAdminUsersSearch.mockReturnValue({
      data: page2Response,
      isLoading: false,
    });

    // Wait a bit and verify page 2 is visible
    await waitFor(
      () => {
        expect(screen.getByText(/Page 2 of 2/i)).toBeInTheDocument();
      },
      { timeout: 500 },
    );

    // Verify that pagination state is preserved
    expect(mockUseAdminUsersSearch).toHaveBeenCalled();
  });

  it('resets page to 0 when search term changes', async () => {
    const initialPage: PageResponse<User> = {
      content: Array.from({ length: 10 }, (_, i) => ({
        ...mockUser,
        id: `u${i}`,
        firstName: `User${i}`,
      })),
      totalElements: 30,
      totalPages: 3,
      page: 0,
      size: 10,
      nextCursor: null,
      prevCursor: null,
      hasNext: true,
      hasPrevious: false,
    };

    mockUseAdminUsersSearch.mockReturnValue({
      data: initialPage,
      isLoading: false,
    });

    renderWithProviders(<DashboardUsersPage />);

    // Go to page 2
    const nextButton = screen.getAllByRole('button').find((btn) =>
      btn.textContent?.includes('Next'),
    );
    fireEvent.click(nextButton!);

    // Type search
    const searchInput = screen.getByPlaceholderText(/search/i) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'new search' } });

    // Wait for debounce and the call with the new search term
    await waitFor(
      () => {
        const calls = mockUseAdminUsersSearch.mock.calls;
        // Find the call that includes the search term and page 0
        const callWithSearch = calls.find((call) => {
          const filter = call[0];
          const pageRequest = call[1];
          return filter.search === 'new search' && pageRequest.page === 0;
        });
        expect(callWithSearch).toBeDefined();
      },
      { timeout: 1000 },
    );
  });
});
