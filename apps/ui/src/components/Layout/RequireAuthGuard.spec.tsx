import { render, screen } from '../../test-utils/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RequireAuthGuard from './RequireAuthGuard'

const useCurrentUser = vi.fn()

vi.mock('../../api/auth', () => ({
  useCurrentUser: () => useCurrentUser(),
}))

vi.mock('../Common/LoadingSpinner', () => ({
  default: () => <div>loading</div>,
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()

  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => (
      <div data-testid="navigate" data-to={to} />
    ),
    Outlet: () => <div data-testid="outlet">outlet</div>,
  }
})

describe('RequireAuthGuard', () => {
  beforeEach(() => {
    useCurrentUser.mockReset()
  })

  it('shows a loading state while the session is being resolved', () => {
    useCurrentUser.mockReturnValue({ data: undefined, isLoading: true })

    render(<RequireAuthGuard />)

    expect(screen.getByText('loading')).toBeTruthy()
    expect(screen.queryByTestId('outlet')).toBeNull()
    expect(screen.queryByTestId('navigate')).toBeNull()
  })

  it('redirects to /login when no session is present', () => {
    useCurrentUser.mockReturnValue({ data: undefined, isLoading: false })

    render(<RequireAuthGuard />)

    expect(screen.getByTestId('navigate').getAttribute('data-to')).toBe(
      '/login',
    )
    expect(screen.queryByTestId('outlet')).toBeNull()
  })

  it('renders the outlet once a signed-in user is resolved', () => {
    useCurrentUser.mockReturnValue({
      data: { id: 1, plexUsername: 'ottodamus' },
      isLoading: false,
    })

    render(<RequireAuthGuard />)

    expect(screen.getByTestId('outlet')).toBeTruthy()
    expect(screen.queryByTestId('navigate')).toBeNull()
  })
})
