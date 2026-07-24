import { AuthProvider, useAuth } from './context/AuthContext'
import Nav from './components/Nav'
import './App.css'

function Archive() {
  const { user } = useAuth()

  return (
    <>
      <section id="browse">
        <h1>Browse the Archive</h1>
        <p>Explore items, collections, and exhibitions — no account required.</p>
      </section>

      {user && (
        <section id="account">
          <h2>Your account</h2>
          <p>
            Signed in as <strong>{user.email}</strong> &middot; role:{' '}
            <code>{user.role}</code>
          </p>
          {user.role === 'super' && (
            <a className="btn-primary" href="/admin" target="_blank" rel="noreferrer">
              Admin panel
            </a>
          )}
        </section>
      )}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Nav />
      <Archive />
    </AuthProvider>
  )
}
