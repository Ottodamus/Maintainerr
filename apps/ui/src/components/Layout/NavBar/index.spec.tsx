import { UserDto, UserRole } from '@maintainerr/contracts'
import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '../../../test-utils/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import SearchContext from '../../../contexts/search-context'
import NavBar from './index'

const logoutMutate = vi.fn()
let currentUser: UserDto | undefined

vi.mock('../../../api/auth', () => ({
  useCurrentUser: () => ({ data: currentUser, isLoading: false }),
  useLogout: () => ({ mutate: logoutMutate, isPending: false }),
}))

vi.mock('../../../router', () => ({
  prefetchRoute: vi.fn(),
}))

vi.mock('../MediaServerSetupGuard', () => ({
  useMediaServerSetupNavigationGuard: () => ({
    isRouteBlocked: () => false,
    showBlockedNavigationToast: vi.fn(),
  }),
}))

vi.mock('../../Messages/Messages', () => ({
  default: () => null,
}))

vi.mock('../../VersionStatus', () => ({
  default: () => null,
}))

vi.mock('@headlessui/react', () => ({
  Transition: ({ children }: { children: ReactNode }) => <>{children}</>,
  TransitionChild: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

const renderNavBar = () =>
  render(
    <MemoryRouter>
      <SearchContext
        value={{
          search: { text: '' },
          addText: vi.fn(),
          removeText: vi.fn(),
        }}
      >
        <NavBar setClosed={vi.fn()} />
      </SearchContext>
    </MemoryRouter>,
  )

describe('NavBar', () => {
  beforeEach(() => {
    logoutMutate.mockReset()
    currentUser = undefined
  })

  it('renders the overlays navigation entry unconditionally', () => {
    // The router-level MediaServerSetupGuard keeps unconfigured users out of
    // the nav entirely, so the overlay link shows for any configured server
    // (Plex or Jellyfin). One instance in the desktop nav, one in mobile.
    renderNavBar()

    expect(screen.getAllByText('Overlays')).toHaveLength(2)
  })

  it('offers a way to sign in when signed out', () => {
    renderNavBar()

    const signInLinks = screen.getAllByRole('link', { name: /sign in/i })
    expect(signInLinks).toHaveLength(2)
    signInLinks.forEach((link) => {
      expect(link.getAttribute('href')).toBe('/login')
    })
  })

  it('shows the current user and signs out on request', () => {
    currentUser = {
      id: 1,
      plexId: '1',
      plexUsername: 'ottodamus',
      email: null,
      thumb: null,
      role: UserRole.ADMIN,
      allowed: true,
      lastLoginAt: null,
      createdAt: new Date(),
    }

    renderNavBar()

    expect(screen.getAllByText('ottodamus')).toHaveLength(2)

    fireEvent.click(screen.getAllByRole('button', { name: 'Sign out' })[0])

    expect(logoutMutate).toHaveBeenCalled()
  })
})
