type User = { id: string; email: string; role: 'user' | 'admin' }
type Props = {
  user: User
  activeTab: 'active' | 'users'
  onTabChange: (tab: 'active' | 'users') => void
  onLogout: () => void
}

export default function Sidebar({ user, activeTab, onTabChange, onLogout }: Props) {
  return (
    <aside className="w-64 bg-gray-800 min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold text-white">NetWatch Admin</h1>
        <p className="text-gray-400 text-sm mt-1">{user.email}</p>
      </div>

      <nav className="flex-1 p-4">
        <button
          onClick={() => onTabChange('active')}
          className={`w-full text-left p-3 rounded mb-2 ${
            activeTab === 'active'
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          Active Users
        </button>
        <button
          onClick={() => onTabChange('users')}
          className={`w-full text-left p-3 rounded ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          User Management
        </button>
      </nav>

      <div className="p-4 border-t border-gray-700">
        <button
          onClick={onLogout}
          className="w-full text-left p-3 rounded text-red-400 hover:bg-gray-700"
        >
          Logout
        </button>
      </div>
    </aside>
  )
}
