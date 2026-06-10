import { useAuth } from '../contexts/AuthContext'

export default function HomePage() {
  const { user, logout } = useAuth()

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Bienvenido</h1>
        {user && <p style={styles.subtitle}>{user.full_name || user.username}</p>}
        <button onClick={logout} style={styles.button}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f2f5',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  card: {
    backgroundColor: '#fff',
    padding: '3rem',
    borderRadius: '12px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    textAlign: 'center',
  },
  title: {
    margin: 0,
    fontSize: '2rem',
    color: '#1a1a2e',
  },
  subtitle: {
    margin: '0.5rem 0 0',
    fontSize: '1.1rem',
    color: '#666',
  },
  button: {
    marginTop: '1.5rem',
    padding: '0.6rem 1.5rem',
    backgroundColor: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
}
