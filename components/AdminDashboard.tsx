'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

type UserRole = 'resident' | 'barangay_official' | 'admin'

const roleLabels: Record<UserRole, string> = {
  resident: 'Resident',
  barangay_official: 'Barangay Official',
  admin: 'Admin'
}

interface User {
  id: string
  email: string
  username?: string
  name?: string
  role: UserRole
  is_frozen: boolean
  created_at: string
}

interface ResidentProfile {
  id: string
  name: string
  username: string
  address: string
  phone: string
  email: string
  status: 'pending' | 'validated'
  role?: UserRole
  created_at: string
}

interface ActivityLog {
  id: string
  user_id: string
  user_name: string
  action: string
  details?: string
  created_at: string
}

interface ForumPost {
  id: string
  user_id: string
  user_name: string
  content: string
  parent_id: string | null
  created_at: string
  archived?: boolean
  reported?: boolean
  report_reason?: string
}

export default function AdminDashboard({ user }: { user: any }) {
  const [activeSection, setActiveSection] = useState('users')
  const [users, setUsers] = useState<User[]>([])
  const [residents, setResidents] = useState<ResidentProfile[]>([])
  const [barangayOfficials, setBarangayOfficials] = useState<ResidentProfile[]>([])
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [reportedPosts, setReportedPosts] = useState<ForumPost[]>([])
  const [loading, setLoading] = useState(true)

  const [sortUsersBy, setSortUsersBy] = useState<'email' | 'role' | 'created_at'>('created_at')
  const [sortResidentsBy, setSortResidentsBy] = useState<'name' | 'username' | 'email' | 'created_at'>('name')
  const [sortOfficialsBy, setSortOfficialsBy] = useState<'name' | 'username' | 'email' | 'created_at'>('name')
  const [sortLogsBy, setSortLogsBy] = useState<'user_name' | 'action' | 'created_at'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      console.log('=== Fetching admin data ===')
      const [residentsRes, logsRes, reportedPostsRes] = await Promise.all([
        supabase.from('resident_profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('activity_logs').select('*').order('created_at', { ascending: false }),
        supabase.from('forum_posts').select('*').eq('reported', true).order('created_at', { ascending: false }),
      ])
      
      console.log('Residents result:', residentsRes)
      console.log('Logs result:', logsRes)
      console.log('Reported posts result:', reportedPostsRes)
      
      if (residentsRes.data) {
        setResidents(residentsRes.data)
        // Convert resident profiles to users for user management
        setUsers(residentsRes.data.map(profile => ({
          id: profile.id,
          email: profile.email,
          username: profile.username,
          name: profile.name,
          role: (profile.role || 'resident') as UserRole,
          is_frozen: false,
          created_at: profile.created_at
        })))
        // Filter residents and barangay officials by role
        setResidents(residentsRes.data.filter(profile => (profile.role || 'resident') === 'resident'))
        setBarangayOfficials(residentsRes.data.filter(profile => (profile.role || 'resident') === 'barangay_official'))
      }
      
      if (logsRes.data && logsRes.data.length > 0) {
        setLogs(logsRes.data)
      } else {
        // Add mock data if no logs exist
        setLogs([
          { id: '1', user_id: '1', user_name: 'resident1', action: 'Login', details: 'User logged in', created_at: new Date().toISOString() },
          { id: '2', user_id: '2', user_name: 'official1', action: 'Created Event', details: 'Created community event', created_at: new Date(Date.now() - 86400000).toISOString() },
          { id: '3', user_id: '1', user_name: 'resident1', action: 'Updated Profile', details: 'Updated resident information', created_at: new Date(Date.now() - 172800000).toISOString() },
        ])
      }
      
      if (reportedPostsRes.data) {
        setReportedPosts(reportedPostsRes.data)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      // Add mock data on error
      setLogs([
        { id: '1', user_id: '1', user_name: 'resident1', action: 'Login', details: 'User logged in', created_at: new Date().toISOString() },
        { id: '2', user_id: '2', user_name: 'official1', action: 'Created Event', details: 'Created community event', created_at: new Date(Date.now() - 86400000).toISOString() },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleChangeRole = async (userId: string, newRole: UserRole) => {
    try {
      // Update in resident_profiles table
      const { error } = await supabase
        .from('resident_profiles')
        .update({ role: newRole })
        .eq('id', userId)
      
      if (error) throw error
      
      // Update local state
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
      
      // Re-filter residents and officials
      setResidents(residents.map(r => r.id === userId ? { ...r, role: newRole } : r).filter(profile => (profile.role || 'resident') === 'resident'))
      setBarangayOfficials(barangayOfficials.map(o => o.id === userId ? { ...o, role: newRole } : o).filter(profile => (profile.role || 'resident') === 'barangay_official'))
      
    } catch (error) {
      console.error('Error updating role:', error)
      alert('Error updating role. Please try again.')
    }
  }

  const handleToggleFreeze = (userId: string) => {
    setUsers(users.map(u => u.id === userId ? { ...u, is_frozen: !u.is_frozen } : u))
  }

  const handleDeleteUser = (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      setUsers(users.filter(u => u.id !== userId))
    }
  }

  const sortedUsers = [...users].sort((a, b) => {
    const aVal = a[sortUsersBy]
    const bVal = b[sortUsersBy]
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1
    }
    return aVal < bVal ? 1 : -1
  })

  const sortedResidents = [...residents].sort((a, b) => {
    const aVal = a[sortResidentsBy]
    const bVal = b[sortResidentsBy]
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1
    }
    return aVal < bVal ? 1 : -1
  })

  const sortedOfficials = [...barangayOfficials].sort((a, b) => {
    const aVal = a[sortOfficialsBy]
    const bVal = b[sortOfficialsBy]
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1
    }
    return aVal < bVal ? 1 : -1
  })

  const sortedLogs = [...logs].sort((a, b) => {
    const aVal = a[sortLogsBy]
    const bVal = b[sortLogsBy]
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1
    }
    return aVal < bVal ? 1 : -1
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F1DE]">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center py-4 md:py-0 md:h-16">
            <div className="flex items-center space-x-3 mb-3 md:mb-0">
              <h1 className="text-xl font-bold text-[#3D405B]">Admin Dashboard</h1>
              <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-[#F2CC8F] text-[#3D405B]">
                Admin
              </span>
            </div>
            <div className="flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-4">
              <p className="text-sm text-[#3D405B] font-medium">{user.email}</p>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-[#E07A5F] text-white rounded-md hover:bg-[#d06a55] w-full md:w-auto"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        <div className="flex space-x-3 md:space-x-4 mb-6 md:mb-8 overflow-x-auto pb-2">
          {[
            { id: 'users', label: 'Users' },
            { id: 'residents', label: 'Residents' },
            { id: 'barangay_officials', label: 'Barangay Officials' },
            { id: 'reported_posts', label: 'Reported Posts', count: reportedPosts.length },
            { id: 'logs', label: 'Logs' },
          ].map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 md:px-6 py-2 md:py-3 rounded-md font-medium whitespace-nowrap text-sm md:text-base relative ${
                activeSection === section.id
                  ? 'bg-[#81B29A] text-white'
                  : 'bg-white text-[#3D405B] hover:bg-[#F2CC8F]'
              }`}
            >
              {section.label}
              {section.count && section.count > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#E07A5F] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {section.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          {activeSection === 'users' && (
            <UserManagementSection
              users={sortedUsers}
              sortUsersBy={sortUsersBy}
              setSortUsersBy={setSortUsersBy}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              onChangeRole={handleChangeRole}
              onToggleFreeze={handleToggleFreeze}
              onDeleteUser={handleDeleteUser}
            />
          )}
          {activeSection === 'residents' && (
            <ResidentProfilesSection
              residents={sortedResidents}
              sortResidentsBy={sortResidentsBy}
              setSortResidentsBy={setSortResidentsBy}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
            />
          )}
          {activeSection === 'barangay_officials' && (
            <BarangayOfficialProfilesSection
              officials={sortedOfficials}
              sortOfficialsBy={sortOfficialsBy}
              setSortOfficialsBy={setSortOfficialsBy}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
            />
          )}
          {activeSection === 'reported_posts' && (
            <ReportedPostsSection reportedPosts={reportedPosts} onSuccess={fetchData} />
          )}
          {activeSection === 'logs' && (
            <ActivityLogsSection
              logs={sortedLogs}
              sortLogsBy={sortLogsBy}
              setSortLogsBy={setSortLogsBy}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function UserManagementSection({
  users,
  sortUsersBy,
  setSortUsersBy,
  sortOrder,
  setSortOrder,
  onChangeRole,
  onToggleFreeze,
  onDeleteUser,
}: {
  users: User[]
  sortUsersBy: 'email' | 'role' | 'created_at'
  setSortUsersBy: (val: 'email' | 'role' | 'created_at') => void
  sortOrder: 'asc' | 'desc'
  setSortOrder: (val: 'asc' | 'desc') => void
  onChangeRole: (userId: string, role: UserRole) => void
  onToggleFreeze: (userId: string) => void
  onDeleteUser: (userId: string) => void
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#3D405B]">User Management</h2>
        <div className="flex space-x-2">
          <select
            value={sortUsersBy}
            onChange={(e) => setSortUsersBy(e.target.value as any)}
            className="px-3 py-2 border border-[#3D405B] rounded-md"
          >
            <option value="email">Sort by Email</option>
            <option value="role">Sort by Role</option>
            <option value="created_at">Sort by Date</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-4 py-2 bg-[#F2CC8F] text-[#3D405B] rounded-md hover:bg-[#E2BC7F]"
          >
            {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 text-[#3D405B]">Name</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Username</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Email</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Role</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Status</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Created</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b hover:bg-[#F4F1DE]">
                <td className="py-3 px-4 text-[#3D405B]">{user.name || '-'}</td>
                <td className="py-3 px-4 text-[#3D405B]">{user.username || '-'}</td>
                <td className="py-3 px-4 text-[#3D405B]">{user.email}</td>
                <td className="py-3 px-4">
                  <select
                    value={user.role}
                    onChange={(e) => onChangeRole(user.id, e.target.value as UserRole)}
                    className="px-2 py-1 border border-[#3D405B] rounded text-sm"
                  >
                    <option value="resident">Resident</option>
                    <option value="barangay_official">Barangay Official</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    user.is_frozen ? 'bg-[#E07A5F] text-white' : 'bg-[#81B29A] text-white'
                  }`}>
                    {user.is_frozen ? 'Frozen' : 'Active'}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-[#3D405B]">{new Date(user.created_at).toLocaleDateString()}</td>
                <td className="py-3 px-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onToggleFreeze(user.id)}
                      className={`px-3 py-1 text-xs rounded ${
                        user.is_frozen ? 'bg-[#81B29A] text-white hover:bg-[#71a28a]' : 'bg-[#F2CC8F] text-[#3D405B] hover:bg-[#E2BC7F]'
                      }`}
                    >
                      {user.is_frozen ? 'Unfreeze' : 'Freeze'}
                    </button>
                    <button
                      onClick={() => onDeleteUser(user.id)}
                      className="px-3 py-1 text-xs bg-[#E07A5F] text-white rounded hover:bg-[#d06a55]"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ResidentProfilesSection({
  residents,
  sortResidentsBy,
  setSortResidentsBy,
  sortOrder,
  setSortOrder,
}: {
  residents: ResidentProfile[]
  sortResidentsBy: 'name' | 'username' | 'email' | 'created_at'
  setSortResidentsBy: (val: 'name' | 'username' | 'email' | 'created_at') => void
  sortOrder: 'asc' | 'desc'
  setSortOrder: (val: 'asc' | 'desc') => void
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#3D405B]">Resident Profiles</h2>
        <div className="flex space-x-2">
          <select
            value={sortResidentsBy}
            onChange={(e) => setSortResidentsBy(e.target.value as any)}
            className="px-3 py-2 border border-[#3D405B] rounded-md"
          >
            <option value="name">Sort by Name</option>
            <option value="username">Sort by Username</option>
            <option value="email">Sort by Email</option>
            <option value="created_at">Sort by Date</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-4 py-2 bg-[#F2CC8F] text-[#3D405B] rounded-md hover:bg-[#E2BC7F]"
          >
            {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 text-[#3D405B]">Name</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Username</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Address</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Phone</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Email</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Status</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Created</th>
            </tr>
          </thead>
          <tbody>
            {residents.map((resident) => (
              <tr key={resident.id} className="border-b hover:bg-[#F4F1DE]">
                <td className="py-3 px-4 font-medium text-[#3D405B]">{resident.name}</td>
                <td className="py-3 px-4 text-[#3D405B]">{resident.username}</td>
                <td className="py-3 px-4 text-[#3D405B]">{resident.address}</td>
                <td className="py-3 px-4 text-[#3D405B]">{resident.phone}</td>
                <td className="py-3 px-4 text-[#3D405B]">{resident.email}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    resident.status === 'validated' ? 'bg-[#81B29A] text-white' : 'bg-[#F2CC8F] text-[#3D405B]'
                  }`}>
                    {resident.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-[#3D405B]">{new Date(resident.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BarangayOfficialProfilesSection({
  officials,
  sortOfficialsBy,
  setSortOfficialsBy,
  sortOrder,
  setSortOrder,
}: {
  officials: ResidentProfile[]
  sortOfficialsBy: 'name' | 'username' | 'email' | 'created_at'
  setSortOfficialsBy: (val: 'name' | 'username' | 'email' | 'created_at') => void
  sortOrder: 'asc' | 'desc'
  setSortOrder: (val: 'asc' | 'desc') => void
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#3D405B]">Barangay Official Profiles</h2>
        <div className="flex space-x-2">
          <select
            value={sortOfficialsBy}
            onChange={(e) => setSortOfficialsBy(e.target.value as any)}
            className="px-3 py-2 border border-[#3D405B] rounded-md"
          >
            <option value="name">Sort by Name</option>
            <option value="username">Sort by Username</option>
            <option value="email">Sort by Email</option>
            <option value="created_at">Sort by Date</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-4 py-2 bg-[#F2CC8F] text-[#3D405B] rounded-md hover:bg-[#E2BC7F]"
          >
            {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 text-[#3D405B]">Name</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Username</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Address</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Phone</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Email</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Status</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Created</th>
            </tr>
          </thead>
          <tbody>
            {officials.map((official) => (
              <tr key={official.id} className="border-b hover:bg-[#F4F1DE]">
                <td className="py-3 px-4 font-medium text-[#3D405B]">{official.name}</td>
                <td className="py-3 px-4 text-[#3D405B]">{official.username}</td>
                <td className="py-3 px-4 text-[#3D405B]">{official.address}</td>
                <td className="py-3 px-4 text-[#3D405B]">{official.phone}</td>
                <td className="py-3 px-4 text-[#3D405B]">{official.email}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    official.status === 'validated' ? 'bg-[#81B29A] text-white' : 'bg-[#F2CC8F] text-[#3D405B]'
                  }`}>
                    {official.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-[#3D405B]">{new Date(official.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ActivityLogsSection({
  logs,
  sortLogsBy,
  setSortLogsBy,
  sortOrder,
  setSortOrder,
}: {
  logs: ActivityLog[]
  sortLogsBy: 'user_name' | 'action' | 'created_at'
  setSortLogsBy: (val: 'user_name' | 'action' | 'created_at') => void
  sortOrder: 'asc' | 'desc'
  setSortOrder: (val: 'asc' | 'desc') => void
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#3D405B]">Activity Logs</h2>
        <div className="flex space-x-2">
          <select
            value={sortLogsBy}
            onChange={(e) => setSortLogsBy(e.target.value as any)}
            className="px-3 py-2 border border-[#3D405B] rounded-md"
          >
            <option value="user_name">Sort by User</option>
            <option value="action">Sort by Action</option>
            <option value="created_at">Sort by Date</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-4 py-2 bg-[#F2CC8F] text-[#3D405B] rounded-md hover:bg-[#E2BC7F]"
          >
            {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 text-[#3D405B]">User</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Action</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Details</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b hover:bg-[#F4F1DE]">
                <td className="py-3 px-4 text-[#3D405B]">{log.user_name}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-[#81B29A] text-white">
                    {log.action}
                  </span>
                </td>
                <td className="py-3 px-4 text-[#3D405B]">{log.details || '-'}</td>
                <td className="py-3 px-4 text-sm text-[#3D405B]">{new Date(log.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ReportedPostsSection({ reportedPosts, onSuccess }: { reportedPosts: ForumPost[]; onSuccess: () => void }) {
  const handleDismissReport = async (postId: string) => {
    if (!confirm('Are you sure you want to dismiss this report?')) return
    try {
      const { error } = await supabase
        .from('forum_posts')
        .update({ reported: false, report_reason: null })
        .eq('id', postId)
      if (error) throw error
      onSuccess()
      alert('Report dismissed successfully!')
    } catch (error) {
      console.error('Error dismissing report:', error)
      alert('Error dismissing report. Please try again.')
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) return
    try {
      const { error } = await supabase
        .from('forum_posts')
        .delete()
        .eq('id', postId)
      if (error) throw error
      onSuccess()
      alert('Post deleted successfully!')
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Error deleting post. Please try again.')
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-[#3D405B]">Reported Posts</h2>
      {reportedPosts.length === 0 ? (
        <p className="text-[#3D405B] text-center py-8">No reported posts</p>
      ) : (
        <div className="space-y-4">
          {reportedPosts.map((post) => (
            <div key={post.id} className="p-4 border-2 border-[#E07A5F] rounded-lg bg-[#F4F1DE]">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-bold text-[#3D405B]">{post.user_name}</span>
                  <span className="text-xs text-[#3D405B] ml-2">{new Date(post.created_at).toLocaleString()}</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleDismissReport(post.id)}
                    className="px-3 py-1 bg-[#81B29A] text-white text-sm rounded-md hover:bg-[#71a28a]"
                  >
                    Dismiss Report
                  </button>
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="px-3 py-1 bg-[#E07A5F] text-white text-sm rounded-md hover:bg-[#d06a55]"
                  >
                    Delete Post
                  </button>
                </div>
              </div>
              {post.report_reason && (
                <div className="mb-2 p-2 bg-[#E07A5F] bg-opacity-10 rounded">
                  <p className="text-sm text-[#E07A5F]"><strong>Report Reason:</strong> {post.report_reason}</p>
                </div>
              )}
              <p className="text-[#3D405B]">{post.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}