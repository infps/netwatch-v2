import { useState, useEffect } from 'react'

type OnlineUser = {
  userId: string
  email: string
  status: 'available' | 'hosting' | 'viewing'
}

type Props = { token: string }

export default function ActiveUsersTab({ token }: Props) {
  const [users, setUsers] = useState<OnlineUser[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOnline = async () => {
    try {
      const res = await fetch('/admin/online', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setUsers(await res.json())
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOnline()
    const interval = setInterval(fetchOnline, 5000)
    return () => clearInterval(interval)
  }, [token])

  const statusColor = (status: OnlineUser['status']) => {
    switch (status) {
      case 'available':
        return 'bg-green-500'
      case 'hosting':
        return 'bg-blue-500'
      case 'viewing':
        return 'bg-purple-500'
    }
  }

  if (loading) {
    return <div className="text-gray-400">Loading...</div>
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Active Users</h2>

      {users.length === 0 ? (
        <p className="text-gray-400">No users online</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-700">
              <th className="pb-3">Email</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Connection</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.userId} className="border-b border-gray-800">
                <td className="py-4 text-white">{u.email}</td>
                <td className="py-4">
                  <span
                    className={`px-2 py-1 rounded text-xs text-white ${statusColor(u.status)}`}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="py-4">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-green-400">Connected</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
