import { useState, useEffect } from 'react'
import UserModal from './UserModal'

type User = {
  id: string
  email: string
  role: string
  createdAt: number
}

type Props = { token: string }

export default function UserManagementTab({ token }: Props) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)

  const fetchUsers = async () => {
    try {
      const res = await fetch('/admin/users', {
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
    fetchUsers()
  }, [token])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return

    const res = await fetch(`/admin/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })

    if (res.ok) {
      setUsers(users.filter((u) => u.id !== id))
    }
  }

  const handleEdit = (user: User) => {
    setEditUser(user)
    setModalOpen(true)
  }

  const handleCreate = () => {
    setEditUser(null)
    setModalOpen(true)
  }

  const handleSave = async (data: { email: string; password?: string; role: string }) => {
    if (editUser) {
      // Update
      const res = await fetch(`/admin/users/${editUser.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      if (res.ok) {
        fetchUsers()
      }
    } else {
      // Create
      const res = await fetch('/admin/users', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      if (res.ok) {
        fetchUsers()
      }
    }
    setModalOpen(false)
  }

  if (loading) {
    return <div className="text-gray-400">Loading...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">User Management</h2>
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add User
        </button>
      </div>

      <table className="w-full">
        <thead>
          <tr className="text-left text-gray-400 border-b border-gray-700">
            <th className="pb-3">Email</th>
            <th className="pb-3">Role</th>
            <th className="pb-3">Created</th>
            <th className="pb-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-gray-800">
              <td className="py-4 text-white">{u.email}</td>
              <td className="py-4">
                <span
                  className={`px-2 py-1 rounded text-xs text-white ${
                    u.role === 'admin' ? 'bg-purple-600' : 'bg-gray-600'
                  }`}
                >
                  {u.role}
                </span>
              </td>
              <td className="py-4 text-gray-400">
                {new Date(u.createdAt).toLocaleDateString()}
              </td>
              <td className="py-4">
                <button
                  onClick={() => handleEdit(u)}
                  className="text-blue-400 hover:text-blue-300 mr-4"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(u.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modalOpen && (
        <UserModal
          user={editUser}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
