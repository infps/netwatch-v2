import { useState, useEffect } from 'react'
import Login from './screens/Login'
import Dashboard from './screens/Dashboard'

type User = { id: string; email: string; role: 'user' | 'admin' }

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('admin_auth')
    if (saved) {
      const { user, token } = JSON.parse(saved)
      if (user.role === 'admin') {
        setUser(user)
        setToken(token)
      }
    }
  }, [])

  const handleLogin = (u: User, t: string) => {
    if (u.role !== 'admin') {
      alert('Admin access required')
      return
    }
    setUser(u)
    setToken(t)
    localStorage.setItem('admin_auth', JSON.stringify({ user: u, token: t }))
  }

  const handleLogout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('admin_auth')
  }

  if (!user || !token) {
    return <Login onLogin={handleLogin} />
  }

  return <Dashboard user={user} token={token} onLogout={handleLogout} />
}
