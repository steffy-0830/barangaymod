'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

type UserRole = 'resident' | 'barangay_official' | 'admin'

const roleLabels: Record<UserRole, string> = {
  resident: 'Resident',
  barangay_official: 'Barangay Official',
  admin: 'Admin'
}

interface Request {
  id: string
  type: string
  description: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  response: string
  created_at: string
}

interface ResidentProfile {
  id: string
  name: string
  username: string
  address: string
  phone: string
  email: string
  status?: 'pending' | 'validated'
  created_at: string
}

interface Event {
  id: string
  title: string
  date: string
  time: string
  start_time: string
  end_time: string
  location: string
  description: string
  status: 'draft' | 'published' | 'denied'
  expires_at: string
  created_at: string
}

interface Notification {
  id: string
  type: 'request_approved' | 'request_rejected' | 'event_published'
  title: string
  message: string
  created_at: string
  hidden?: boolean
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

interface MinimalResident {
  id: string
  name: string
  username: string
  email: string
}

export default function Dashboard({ user }: { user: any }) {
  const [activeSection, setActiveSection] = useState('notifications')
  const userRole = (user.user_metadata?.role || 'resident') as UserRole
  const [requests, setRequests] = useState<Request[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [hiddenNotificationIds, setHiddenNotificationIds] = useState<string[]>([])
  const [showHiddenNotifications, setShowHiddenNotifications] = useState(false)
  const [residentProfile, setResidentProfile] = useState<ResidentProfile | null>(null)
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([])
  const [loading, setLoading] = useState(true)

  const visibleNotifications = showHiddenNotifications 
    ? notifications 
    : notifications.filter(n => !hiddenNotificationIds.includes(n.id))

  const handleHideNotification = (id: string) => {
    setHiddenNotificationIds(prev => [...prev, id])
  }

  const handleShowHiddenNotifications = () => {
    setShowHiddenNotifications(prev => !prev)
  }

  const handleArchiveForumPost = async (postId: string) => {
    try {
      const { error } = await supabase.from('forum_posts').update({ archived: true }).eq('id', postId)
      if (error) throw error
      setForumPosts(prev => prev.map(p => p.id === postId ? { ...p, archived: true } : p))
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const handleReportForumPost = async (postId: string) => {
    const reason = prompt('Please provide a reason for reporting this post:')
    if (reason === null) return
    try {
      const { error } = await supabase.from('forum_posts').update({ reported: true, report_reason: reason }).eq('id', postId)
      if (error) throw error
      setForumPosts(prev => prev.map(p => p.id === postId ? { ...p, reported: true, report_reason: reason } : p))
      alert('Post reported successfully!')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  useEffect(() => {
    fetchData()
  }, [user.id])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [requestsRes, eventsRes, profileRes, forumRes] = await Promise.all([
        supabase.from('requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('events_and_announcements').select('*').eq('status', 'published').order('created_at', { ascending: false }),
        supabase.from('resident_profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('forum_posts').select('*').order('created_at', { ascending: true }),
      ])

      if (requestsRes.data) {
        setRequests(requestsRes.data)
        const requestNotifs: Notification[] = requestsRes.data
          .filter(r => r.status !== 'pending')
          .map(r => ({
            id: `req-${r.id}`,
            type: r.status === 'approved' ? 'request_approved' : 'request_rejected',
            title: r.status === 'approved' ? 'Request Approved!' : 'Request Denied',
            message: `Your ${r.type.toLowerCase()} has been ${r.status}. ${r.response ? `Response: ${r.response}` : ''}`,
            created_at: r.created_at
          }))
        setNotifications(requestNotifs)
      }

      if (eventsRes.data) {
        const now = new Date()
        const nonExpiredEvents = eventsRes.data.filter(event => !event.expires_at || new Date(event.expires_at) > now)
        setEvents(nonExpiredEvents)
        const eventNotifs: Notification[] = nonExpiredEvents.map(e => ({
          id: `evt-${e.id}`,
          type: 'event_published',
          title: 'New Event Published!',
          message: `${e.title} - ${new Date(e.date).toLocaleDateString()} at ${e.location}`,
          created_at: e.created_at
        }))
        setNotifications(prev => [...prev, ...eventNotifs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      }

      if (profileRes.data) {
        setResidentProfile(profileRes.data)
      }

      if (forumRes.data) {
        setForumPosts(forumRes.data)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

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
            <h1 className="text-xl font-bold text-[#3D405B] mb-3 md:mb-0">Barangay Management System</h1>
            <div className="flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-4">
              <div className="text-center md:text-right">
                <p className="text-sm text-[#3D405B] font-medium">{user.email}</p>
                <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                  userRole === 'admin' ? 'bg-[#F2CC8F] text-[#3D405B]' :
                  userRole === 'barangay_official' ? 'bg-[#81B29A] text-white' :
                  'bg-[#E07A5F] text-white'
                }`}>
                  {roleLabels[userRole]}
                </span>
              </div>
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
            { id: 'notifications', label: 'Notifications', count: notifications.length },
            { id: 'resident', label: 'Resident Info' },
            { id: 'requests', label: 'Requests' },
            { id: 'emergency', label: 'Emergency' },
            { id: 'events', label: 'Events' },
            { id: 'forum', label: 'Forum' },
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
              {section.count && section.count > 0 && section.id === 'notifications' && (
                <span className="absolute -top-1 -right-1 bg-[#E07A5F] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {section.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          {activeSection === 'notifications' && <NotificationsSection notifications={visibleNotifications} onHideNotification={handleHideNotification} showHiddenNotifications={showHiddenNotifications} onToggleShowHidden={handleShowHiddenNotifications} />}
          {activeSection === 'resident' && <ResidentSection user={user} onSuccess={fetchData} existingProfile={residentProfile} />}
          {activeSection === 'requests' && <RequestsSection user={user} onSuccess={fetchData} requests={requests} />}
          {activeSection === 'emergency' && <EmergencySection user={user} />}
          {activeSection === 'events' && <EventsSection events={events} />}
          {activeSection === 'forum' && <ForumSection user={user} forumPosts={forumPosts} onSuccess={fetchData} existingProfile={residentProfile} onArchivePost={handleArchiveForumPost} onReportPost={handleReportForumPost} />}
        </div>
      </div>
    </div>
  )
}

function NotificationsSection({ 
  notifications, 
  onHideNotification, 
  showHiddenNotifications, 
  onToggleShowHidden 
}: { 
  notifications: Notification[]; 
  onHideNotification: (id: string) => void;
  showHiddenNotifications: boolean;
  onToggleShowHidden: () => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#3D405B]">Notifications</h2>
        <button
          onClick={onToggleShowHidden}
          className="px-4 py-2 bg-[#F2CC8F] text-[#3D405B] rounded-md hover:bg-[#E2BC7F]"
        >
          {showHiddenNotifications ? 'Hide Hidden Notifications' : 'Show Hidden Notifications'}
        </button>
      </div>
      {notifications.length === 0 ? (
        <p className="text-[#3D405B] text-center py-8">No notifications yet</p>
      ) : (
        <div className="space-y-4">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-lg border ${
                notif.type === 'request_approved' ? 'border-[#81B29A] bg-[#F4F1DE]' :
                notif.type === 'request_rejected' ? 'border-[#E07A5F] bg-[#F4F1DE]' :
                'border-[#81B29A] bg-[#F4F1DE]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className={`font-bold ${
                    notif.type === 'request_approved' ? 'text-[#81B29A]' :
                    notif.type === 'request_rejected' ? 'text-[#E07A5F]' :
                    'text-[#81B29A]'
                  }`}>
                    {notif.title}
                  </h3>
                  <p className="mt-1 text-[#3D405B]">{notif.message}</p>
                  <p className="mt-2 text-xs text-[#3D405B]">{new Date(notif.created_at).toLocaleString()}</p>
                </div>
                <div className="flex flex-col items-end space-y-2 ml-4">
                  <div>
                    {notif.type === 'request_approved' && <span className="text-2xl">✅</span>}
                    {notif.type === 'request_rejected' && <span className="text-2xl">❌</span>}
                    {notif.type === 'event_published' && <span className="text-2xl">📢</span>}
                  </div>
                  {!showHiddenNotifications && (
                    <button
                      onClick={() => onHideNotification(notif.id)}
                      className="text-xs text-[#3D405B] hover:text-[#E07A5F] hover:underline"
                    >
                      Hide
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ResidentSection({ user, onSuccess, existingProfile }: { user: any; onSuccess: () => void; existingProfile: ResidentProfile | null }) {
  const [formData, setFormData] = useState({
    name: existingProfile?.name || '',
    username: existingProfile?.username || '',
    address: existingProfile?.address || '',
    phone: existingProfile?.phone || '',
    email: existingProfile?.email || user.email || '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (existingProfile) {
      setFormData({
        name: existingProfile.name || '',
        username: existingProfile.username || '',
        address: existingProfile.address || '',
        phone: existingProfile.phone || '',
        email: existingProfile.email || '',
      })
    } else {
      setFormData({
        name: '',
        username: '',
        address: '',
        phone: '',
        email: user.email || '',
      })
    }
  }, [existingProfile, user.email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    console.log('=== Saving resident profile ===')
    console.log('User ID:', user.id)
    console.log('Form data:', formData)
    try {
      if (existingProfile) {
        console.log('Updating existing profile')
        const { error } = await supabase.from('resident_profiles').update({
          name: formData.name,
          username: formData.username,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
        }).eq('id', user.id)
        if (error) {
          console.error('Update error:', error)
          throw error
        }
        alert('Profile updated successfully!')
      } else {
        console.log('Creating new profile')
        const { error } = await supabase.from('resident_profiles').insert({
          id: user.id,
          name: formData.name,
          username: formData.username,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
        })
        if (error) {
          console.error('Insert error:', error)
          throw error
        }
        alert('Profile created successfully!')
      }
      onSuccess()
    } catch (error) {
      console.error('Error:', error)
      alert(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Resident Information</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '') // Only allow numbers
              if (value.length <= 11) { // Limit to 11 digits
                setFormData({ ...formData, phone: value })
              }
            }}
            maxLength={11}
            pattern="[0-9]{11}"
            title="Please enter exactly 11 digits"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Exactly 11 digits required</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : existingProfile ? 'Update Profile' : 'Create Profile'}
        </button>
      </form>
    </div>
  )
}

function RequestsSection({ user, onSuccess, requests }: { user: any; onSuccess: () => void; requests: Request[] }) {
  const [formData, setFormData] = useState({
    type: '',
    description: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.from('requests').insert({
        user_id: user.id,
        resident_name: user.email,
        type: formData.type,
        description: formData.description,
        status: 'pending',
      })
      if (error) throw error
      alert('Request submitted successfully!')
      setFormData({ type: '', description: '' })
      onSuccess()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to cancel this request?')) return
    try {
      const { error } = await supabase.from('requests').update({ status: 'cancelled' }).eq('id', requestId)
      if (error) throw error
      alert('Request cancelled successfully!')
      onSuccess()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    }
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Requests and Inquiries</h2>
      
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Submit New Request</h3>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Request Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            >
              <option value="">Select type</option>
              <option value="document">Document Request</option>
              <option value="certificate">Certificate Request</option>
              <option value="permit">Permit Request</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={4}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Your Requests</h3>
        {requests.length === 0 ? (
          <p className="text-gray-500">No requests yet</p>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-gray-800">{request.type}</h4>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="mt-1 text-gray-700">{request.description}</p>
                    {request.response && (
                      <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        Response: {request.response}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-gray-500">
                      Submitted: {new Date(request.created_at).toLocaleString()}
                    </p>
                  </div>
                  {request.status === 'pending' && (
                    <button
                      onClick={() => handleCancelRequest(request.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmergencySection({ user }: { user: any }) {
  const [formData, setFormData] = useState({
    type: '',
    location: '',
    description: '',
    contact: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.from('emergency_reports').insert({
        user_id: user.id,
        type: formData.type,
        location: formData.location,
        description: formData.description,
        contact: formData.contact,
      })
      if (error) throw error
      alert('Emergency report submitted successfully!')
      setFormData({ type: '', location: '', description: '', contact: '' })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Emergency Reports</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          >
            <option value="">Select type</option>
            <option value="fire">Fire</option>
            <option value="medical">Medical Emergency</option>
            <option value="crime">Crime</option>
            <option value="natural">Natural Disaster</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={4}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
          <input
            type="tel"
            value={formData.contact}
            onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Emergency Report'}
        </button>
      </form>
    </div>
  )
}

function EventsSection({ events }: { events: Event[] }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Published Events & Announcements</h2>
      {events.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No events published yet</p>
      ) : (
        <div className="space-y-6">
          {events.map((event) => (
            <div key={event.id} className="p-6 border border-gray-200 rounded-lg bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">{event.title}</h3>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Date:</span> {new Date(event.date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Time:</span> {event.start_time} - {event.end_time}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Location:</span> {event.location}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-gray-700">{event.description}</p>
              <p className="mt-2 text-xs text-gray-500">
                Published: {new Date(event.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ForumSection({ user, forumPosts, onSuccess, existingProfile, onArchivePost, onReportPost }: { user: any; forumPosts: ForumPost[]; onSuccess: () => void; existingProfile: ResidentProfile | null; onArchivePost: (id: string) => void; onReportPost: (id: string) => void }) {
  const [newPost, setNewPost] = useState('')
  const [replyTo, setReplyTo] = useState<ForumPost | null>(null)
  const [loading, setLoading] = useState(false)
  const [residents, setResidents] = useState<MinimalResident[]>([])

  useEffect(() => {
    fetchResidents()
  }, [])

  const fetchResidents = async () => {
    const { data } = await supabase.from('resident_profiles').select('id, name, username, email')
    if (data) setResidents(data as MinimalResident[])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPost.trim()) return
    setLoading(true)
    try {
      const { error } = await supabase.from('forum_posts').insert({
        user_id: user.id,
        user_name: existingProfile?.username || user.email,
        content: newPost,
        parent_id: replyTo?.id || null,
      })
      if (error) throw error
      setNewPost('')
      setReplyTo(null)
      onSuccess()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleReply = (post: ForumPost) => {
    setReplyTo(post)
    setNewPost(`@${post.user_name} `)
  }

  const renderContent = (content: string) => {
    let result = content
    residents.forEach(resident => {
      if (resident.username) {
        const regex = new RegExp(`@${resident.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g')
        result = result.replace(regex, `<span class="text-blue-600 font-semibold">@${resident.username}</span>`)
      }
    })
    return <span dangerouslySetInnerHTML={{ __html: result }} />
  }

  const visibleForumPosts = forumPosts.filter(post => !post.archived)
  const parentPosts = visibleForumPosts.filter(post => !post.parent_id)
  const replies = visibleForumPosts.filter(post => post.parent_id)

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Community Forum</h2>
      <div className="mb-8">
        {replyTo && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">Replying to <strong>{replyTo.user_name}</strong></p>
            <button
              onClick={() => { setReplyTo(null); setNewPost('') }}
              className="text-xs text-gray-500 hover:text-gray-700 mt-1"
            >
              Cancel reply
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-4">
          <input
            type="text"
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder={replyTo ? `Reply to ${replyTo.user_name}...` : "Type your message here... (Use @ to mention people by username)"}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {parentPosts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No posts yet. Be the first to post!</p>
        ) : (
          parentPosts.map((post) => (
            <div key={post.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-gray-800">{post.user_name}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">{new Date(post.created_at).toLocaleString()}</span>
                  {post.user_id === user.id && (
                    <button
                      onClick={() => onArchivePost(post.id)}
                      className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
                    >
                      Archive
                    </button>
                  )}
                  <button
                    onClick={() => onReportPost(post.id)}
                    className="text-xs text-red-500 hover:text-red-700 hover:underline"
                  >
                    Report
                  </button>
                </div>
              </div>
              <p className="text-gray-700">{renderContent(post.content)}</p>
              <div className="flex items-center space-x-4 mt-2">
                <button
                  onClick={() => handleReply(post)}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Reply
                </button>
              </div>
              {replies.filter(reply => reply.parent_id === post.id).map((reply) => (
                <div key={reply.id} className="mt-3 ml-6 p-3 border-l-2 border-gray-300 bg-white rounded">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-gray-700 text-sm">{reply.user_name}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">{new Date(reply.created_at).toLocaleString()}</span>
                      {reply.user_id === user.id && (
                        <button
                          onClick={() => onArchivePost(reply.id)}
                          className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
                        >
                          Archive
                        </button>
                      )}
                      <button
                        onClick={() => onReportPost(reply.id)}
                        className="text-xs text-red-500 hover:text-red-700 hover:underline"
                      >
                        Report
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm">{renderContent(reply.content)}</p>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
