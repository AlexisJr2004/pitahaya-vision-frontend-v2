import { useAuth } from '../contexts/AuthContext'
import LoadingScreen from './LoadingScreen'

export default function AuthTransitionLoader() {
  const { showAuthLoader } = useAuth()
  return showAuthLoader ? <LoadingScreen /> : null
}
