import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import AuthModal from './AuthModal'

export default function Nav() {
  const { user, loading, logout } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <nav className="site-nav">
        <span className="site-name">Archive Explorer</span>
        <div className="nav-actions">
          {!loading && (
            user ? (
              <>
                <span className="nav-user">{user.name}</span>
                <button className="btn-ghost" onClick={() => void logout()}>Log out</button>
              </>
            ) : (
              <button className="btn-primary" onClick={() => setModalOpen(true)}>Log in</button>
            )
          )}
        </div>
      </nav>
      {modalOpen && <AuthModal onClose={() => setModalOpen(false)} />}
    </>
  )
}
