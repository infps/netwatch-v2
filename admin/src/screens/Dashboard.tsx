import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import ActiveUsersTab from '../components/ActiveUsersTab'
import UserManagementTab from '../components/UserManagementTab'

type User = { id: string; email: string; role: 'user' | 'admin' }
type Props = { user: User; token: string; onLogout: () => void }

export default function Dashboard({ user, token, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<'active' | 'users'>('active')

  return (
    <div className="min-h-screen bg-gray-900 flex">
      <Sidebar
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={onLogout}
      />
      <main className="flex-1 p-8">
        {activeTab === 'active' && <ActiveUsersTab token={token} />}
        {activeTab === 'users' && <UserManagementTab token={token} />}
      </main>
    </div>
  )
}
