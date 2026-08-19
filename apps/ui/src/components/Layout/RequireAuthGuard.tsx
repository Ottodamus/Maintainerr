import { Navigate, Outlet } from 'react-router-dom'
import { useCurrentUser } from '../../api/auth'
import LoadingSpinner from '../Common/LoadingSpinner'

// Wraps every route under the main Layout (router.tsx) - the backend enforces
// this too (JwtAuthGuard as a global APP_GUARD), so this is what turns a 401
// into a redirect instead of a page full of failed data fetches.
const RequireAuthGuard = () => {
  const { data: currentUser, isLoading } = useCurrentUser()

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default RequireAuthGuard
