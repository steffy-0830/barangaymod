'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

type UserRole = 'resident' | 'barangay_official' | 'admin'

interface Request {
  id: string
  user_id: string
  type: string
  resident_name: string
  description: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  response: string
  created_at: string
}

interface EmergencyReport {
  id: string
  user_id: string
  type: string
  location: string
  description: string
  contact: string
  status: 'pending' | 'responded'
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
  created_at: string
}

interface Event {
  id: string
  created_by: string
  title: string
  date: string
  time: string
  start_time: string
  end_time: string
  location: string
  description: string
  status: 'draft' | 'published' | 'denied'
  denial_reason: string
  expires_at: string
  created_at: string
}

interface ForumPost {
  id: string
  user_id: string
  user_name: string
  content: string
  parent_id: string | null
  created_at: string
}

interface MinimalResident {
  id: string
  name: string
  username: string
  email: string
}

export default function PersonnelDashboard({ user }: { user: any }) {
  const [activeSection, setActiveSection] = useState('notifications')
  const [requests, setRequests] = useState<Request[]>([])
  const [emergencies, setEmergencies] = useState<EmergencyReport[]>([])
  const [residents, setResidents] = useState<ResidentProfile[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([])
  const [myProfile, setMyProfile] = useState<ResidentProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [requestsRes, emergenciesRes, residentsRes, eventsRes, forumRes, profileRes] = await Promise.all([
        supabase.from('requests').select('*').order('created_at', { ascending: false }),
        supabase.from('emergency_reports').select('*').order('created_at', { ascending: false }),
        supabase.from('resident_profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('events_and_announcements').select('*').order('created_at', { ascending: false }),
        supabase.from('forum_posts').select('*').order('created_at', { ascending: true }),
        supabase.from('resident_profiles').select('*').eq('id', user.id).single(),
      ])

      if (requestsRes.data) setRequests(requestsRes.data)
      if (emergenciesRes.data) setEmergencies(emergenciesRes.data)
      if (residentsRes.data) setResidents(residentsRes.data)
      if (eventsRes.data) setEvents(eventsRes.data)
      if (forumRes.data) setForumPosts(forumRes.data)
      if (profileRes.data) setMyProfile(profileRes.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleApproveRequest = async (id: string) => {
    if (!confirm('Are you sure you want to approve this request?')) return
    try {
      const { error } = await supabase.from('requests').update({ status: 'approved' }).eq('id', id)
      if (error) throw error
      setRequests(requests.map(r => r.id === id ? { ...r, status: 'approved' } : r))
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const handleRejectRequest = async (id: string) => {
    const reason = prompt('Please provide a reason for rejection:')
    if (reason === null) return
    try {
      const { error } = await supabase.from('requests').update({ status: 'rejected', response: reason }).eq('id', id)
      if (error) throw error
      setRequests(requests.map(r => r.id === id ? { ...r, status: 'rejected', response: reason } : r))
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const handleRespondEmergency = async (id: string) => {
    if (!confirm('Are you sure you want to mark this emergency as responded?')) return
    try {
      const { error } = await supabase.from('emergency_reports').update({ status: 'responded' }).eq('id', id)
      if (error) throw error
      setEmergencies(emergencies.map(e => e.id === id ? { ...e, status: 'responded' } : e))
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const handleValidateResident = async (id: string) => {
    if (!confirm('Are you sure you want to validate this resident profile?')) return
    try {
      const { error } = await supabase.from('resident_profiles').update({ status: 'validated' }).eq('id', id)
      if (error) throw error
      setResidents(residents.map(r => r.id === id ? { ...r, status: 'validated' } : r))
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const handlePublishEvent = async (id: string) => {
    if (!confirm('Are you sure you want to publish this event?')) return
    try {
      const { error } = await supabase.from('events_and_announcements').update({ status: 'published' }).eq('id', id)
      if (error) throw error
      setEvents(events.map(e => e.id === id ? { ...e, status: 'published' } : e))
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const handleDenyEvent = async (id: string) => {
    const reason = prompt('Please provide a reason for denial:')
    if (reason === null) return
    try {
      const { error } = await supabase.from('events_and_announcements').update({ status: 'denied', denial_reason: reason }).eq('id', id)
      if (error) throw error
      setEvents(events.map(e => e.id === id ? { ...e, status: 'denied', denial_reason: reason } : e))
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const handleAddEvent = async (newEvent: Omit<Event, 'id' | 'created_at'>) => {
    console.log('=== Adding event ===')
    console.log('New event data:', newEvent)
    try {
      const { data, error } = await supabase.from('events_and_announcements').insert({
        created_by: user.id,
        title: newEvent.title,
        date: newEvent.date,
        time: newEvent.start_time,
        start_time: newEvent.start_time,
        end_time: newEvent.end_time,
        location: newEvent.location,
        description: newEvent.description,
        status: newEvent.status,
        denial_reason: newEvent.denial_reason || null,
        expires_at: newEvent.expires_at || null,
      }).select()
      if (error) {
        console.error('Event insert error:', error)
        throw error
      }
      if (data) setEvents([...data, ...events])
    } catch (error) {
      console.error('Error:', error)
      alert(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const unreadCount = requests.filter(r => r.status === 'pending').length + emergencies.filter(e => e.status === 'pending').length

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
              <h1 className="text-xl font-bold text-[#3D405B]">Personnel Dashboard</h1>
              <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-[#81B29A] text-white">
                Barangay Official
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
            { id: 'notifications', label: 'Notifications', count: unreadCount },
            { id: 'profile', label: 'Profile' },
            { id: 'validate', label: 'Validate' },
            { id: 'requests', label: 'Requests' },
            { id: 'users', label: 'Users' },
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
              {section.count && section.count > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#E07A5F] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {section.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          {activeSection === 'notifications' && (
            <NotificationsSection
              requests={requests}
              emergencies={emergencies}
              onApproveRequest={handleApproveRequest}
              onRejectRequest={handleRejectRequest}
              onRespondEmergency={handleRespondEmergency}
            />
          )}
          {activeSection === 'profile' && (
            <ProfileSection
              user={user}
              existingProfile={myProfile}
              onSuccess={() => fetchData()}
            />
          )}
          {activeSection === 'validate' && (
            <ValidateResidentsSection
              residents={residents}
              onValidateResident={handleValidateResident}
            />
          )}
          {activeSection === 'requests' && (
            <RequestsInquiriesSection
              requests={requests}
              onApproveRequest={handleApproveRequest}
              onRejectRequest={handleRejectRequest}
            />
          )}
          {activeSection === 'users' && (
            <UserResidentDataSection residents={residents} />
          )}
          {activeSection === 'events' && (
            <EventsAnnouncementsSection
              events={events}
              onPublishEvent={handlePublishEvent}
              onDenyEvent={handleDenyEvent}
              onAddEvent={handleAddEvent}
            />
          )}
          {activeSection === 'forum' && (
            <ForumSection user={user} forumPosts={forumPosts} onSuccess={fetchData} />
          )}
        </div>
      </div>
    </div>
  )
}

function NotificationsSection({
  requests,
  emergencies,
  onApproveRequest,
  onRejectRequest,
  onRespondEmergency,
}: {
  requests: Request[]
  emergencies: EmergencyReport[]
  onApproveRequest: (id: string) => void
  onRejectRequest: (id: string) => void
  onRespondEmergency: (id: string) => void
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-[#3D405B]">Notifications</h2>

      {emergencies.filter(e => e.status === 'pending').length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-[#E07A5F]">⚠️ Emergency Reports (Priority)</h3>
          <div className="space-y-4">
            {emergencies.filter(e => e.status === 'pending').map((emergency) => (
              <div key={emergency.id} className="border-2 border-[#E07A5F] bg-[#F4F1DE] p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-[#3D405B]">{emergency.type}</h4>
                    <p className="text-sm text-[#3D405B]">Location: {emergency.location}</p>
                    <p className="text-sm text-[#3D405B]">Contact: {emergency.contact}</p>
                    <p className="mt-2 text-[#3D405B]">{emergency.description}</p>
                    <p className="text-xs text-[#3D405B] mt-2">{new Date(emergency.created_at).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => onRespondEmergency(emergency.id)}
                    className="px-4 py-2 bg-[#E07A5F] text-white rounded-md hover:bg-[#d06a55]"
                  >
                    Mark as Responded
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-4 text-[#3D405B]">Requests & Inquiries</h3>
        <div className="space-y-4">
          {requests.filter(r => r.status === 'pending').map((request) => (
            <div key={request.id} className="border border-[#3D405B] p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-[#3D405B]">{request.type}</h4>
                  <p className="text-sm text-[#3D405B]">From: {request.resident_name}</p>
                  <p className="mt-2 text-[#3D405B]">{request.description}</p>
                  <p className="text-xs text-[#3D405B] mt-2">{new Date(request.created_at).toLocaleString()}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onApproveRequest(request.id)}
                    className="px-4 py-2 bg-[#81B29A] text-white rounded-md hover:bg-[#71a28a]"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => onRejectRequest(request.id)}
                    className="px-4 py-2 bg-[#E07A5F] text-white rounded-md hover:bg-[#d06a55]"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ValidateResidentsSection({
  residents,
  onValidateResident,
}: {
  residents: ResidentProfile[]
  onValidateResident: (id: string) => void
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-[#3D405B]">Validate Resident Profiles</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 text-[#3D405B]">Name</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Address</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Phone</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Email</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Status</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Action</th>
            </tr>
          </thead>
          <tbody>
            {residents.map((resident) => (
              <tr key={resident.id} className="border-b hover:bg-[#F4F1DE]">
                <td className="py-3 px-4 font-medium text-[#3D405B]">{resident.name}</td>
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
                <td className="py-3 px-4">
                  {resident.status === 'pending' && (
                    <button
                      onClick={() => onValidateResident(resident.id)}
                      className="px-4 py-2 bg-[#81B29A] text-white rounded-md hover:bg-[#71a28a]"
                    >
                      Validate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RequestsInquiriesSection({
  requests,
  onApproveRequest,
  onRejectRequest,
}: {
  requests: Request[]
  onApproveRequest: (id: string) => void
  onRejectRequest: (id: string) => void
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-[#3D405B]">Requests & Inquiries</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 text-[#3D405B]">Type</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Resident</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Description</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Date</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Status</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id} className="border-b hover:bg-[#F4F1DE]">
                <td className="py-3 px-4 font-medium text-[#3D405B]">{request.type}</td>
                <td className="py-3 px-4 text-[#3D405B]">{request.resident_name}</td>
                <td className="py-3 px-4 text-[#3D405B]">{request.description}</td>
                <td className="py-3 px-4 text-sm text-[#3D405B]">{new Date(request.created_at).toLocaleDateString()}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    request.status === 'approved' ? 'bg-[#81B29A] text-white' :
                    request.status === 'rejected' ? 'bg-[#E07A5F] text-white' :
                    'bg-[#F2CC8F] text-[#3D405B]'
                  }`}>
                    {request.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {request.status === 'pending' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onApproveRequest(request.id)}
                        className="px-3 py-1 bg-[#81B29A] text-white text-sm rounded-md hover:bg-[#71a28a]"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => onRejectRequest(request.id)}
                        className="px-3 py-1 bg-[#E07A5F] text-white text-sm rounded-md hover:bg-[#d06a55]"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function UserResidentDataSection({ residents }: { residents: ResidentProfile[] }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-[#3D405B]">User & Resident Data</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 text-[#3D405B]">Name</th>
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

function EventsAnnouncementsSection({
  events,
  onPublishEvent,
  onDenyEvent,
  onAddEvent,
}: {
  events: Event[]
  onPublishEvent: (id: string) => void
  onDenyEvent: (id: string) => void
  onAddEvent: (event: Omit<Event, 'id' | 'created_at'>) => void
}) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEvent, setNewEvent] = useState<Omit<Event, 'id' | 'created_at'>>({
    created_by: '',
    title: '',
    date: '',
    time: '',
    start_time: '',
    end_time: '',
    location: '',
    description: '',
    status: 'draft',
    denial_reason: '',
    expires_at: '',
  })

  const calculateExpiresAt = () => {
    if (newEvent.date && newEvent.end_time) {
      const dateTime = new Date(`${newEvent.date}T${newEvent.end_time}`)
      dateTime.setHours(dateTime.getHours() + 24)
      return dateTime.toISOString()
    }
    return ''
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#3D405B]">Events & Announcements</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-[#81B29A] text-white rounded-md hover:bg-[#71a28a]"
        >
          {showAddForm ? 'Cancel' : '+ Add Event'}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-8 p-6 border border-[#3D405B] rounded-lg bg-[#F4F1DE]">
          <h3 className="text-lg font-semibold mb-4 text-[#3D405B]">Create New Event</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const expires_at = calculateExpiresAt()
              onAddEvent({ ...newEvent, expires_at })
              setNewEvent({ created_by: '', title: '', date: '', time: '', start_time: '', end_time: '', location: '', description: '', status: 'draft', denial_reason: '', expires_at: '' })
              setShowAddForm(false)
            }}
            className="space-y-4 max-w-2xl"
          >
            <div>
              <label className="block text-sm font-medium text-[#3D405B] mb-1">Title</label>
              <input
                type="text"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                className="w-full px-3 py-2 border border-[#3D405B] rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3D405B] mb-1">Date</label>
              <input
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                className="w-full px-3 py-2 border border-[#3D405B] rounded-md"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#3D405B] mb-1">Start Time</label>
                <input
                  type="time"
                  value={newEvent.start_time}
                  onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-[#3D405B] rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#3D405B] mb-1">End Time</label>
                <input
                  type="time"
                  value={newEvent.end_time}
                  onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-[#3D405B] rounded-md"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3D405B] mb-1">Location</label>
              <input
                type="text"
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                className="w-full px-3 py-2 border border-[#3D405B] rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3D405B] mb-1">Description</label>
              <textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                className="w-full px-3 py-2 border border-[#3D405B] rounded-md"
                rows={3}
                required
              />
            </div>
            <div className="flex space-x-4">
              <button
                type="submit"
                className="px-6 py-2 bg-[#81B29A] text-white rounded-md hover:bg-[#71a28a]"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => {
                  const expires_at = calculateExpiresAt()
                  onAddEvent({ ...newEvent, status: 'published', expires_at })
                  setNewEvent({ created_by: '', title: '', date: '', time: '', start_time: '', end_time: '', location: '', description: '', status: 'draft', denial_reason: '', expires_at: '' })
                  setShowAddForm(false)
                }}
                className="px-6 py-2 bg-[#81B29A] text-white rounded-md hover:bg-[#71a28a]"
              >
                Publish Immediately
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 text-[#3D405B]">Title</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Date</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Time</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Location</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Status</th>
              <th className="text-left py-3 px-4 text-[#3D405B]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-b hover:bg-[#F4F1DE]">
                <td className="py-3 px-4 font-medium text-[#3D405B]">{event.title}</td>
                <td className="py-3 px-4 text-[#3D405B]">{event.date}</td>
                <td className="py-3 px-4 text-[#3D405B]">{event.start_time} - {event.end_time}</td>
                <td className="py-3 px-4 text-[#3D405B]">{event.location}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    event.status === 'published' ? 'bg-[#81B29A] text-white' :
                    event.status === 'denied' ? 'bg-[#E07A5F] text-white' :
                    'bg-[#F2CC8F] text-[#3D405B]'
                  }`}>
                    {event.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {event.status === 'draft' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onPublishEvent(event.id)}
                        className="px-3 py-1 bg-[#81B29A] text-white text-sm rounded-md hover:bg-[#71a28a]"
                      >
                        Publish
                      </button>
                      <button
                        onClick={() => onDenyEvent(event.id)}
                        className="px-3 py-1 bg-[#E07A5F] text-white text-sm rounded-md hover:bg-[#d06a55]"
                      >
                        Deny
                      </button>
                    </div>
                  )}
                  {event.status === 'denied' && event.denial_reason && (
                    <p className="text-xs text-[#E07A5F]">Reason: {event.denial_reason}</p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ForumSection({ user, forumPosts, onSuccess }: { user: any; forumPosts: ForumPost[]; onSuccess: () => void }) {
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
      const officialResident = residents.find(r => r.id === user.id)
      const { error } = await supabase.from('forum_posts').insert({
        user_id: user.id,
        user_name: officialResident?.username || user.email,
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
        result = result.replace(regex, `<span class="text-[#81B29A] font-semibold">@${resident.username}</span>`)
      }
    })
    return <span dangerouslySetInnerHTML={{ __html: result }} />
  }

  const parentPosts = forumPosts.filter(post => !post.parent_id)
  const replies = forumPosts.filter(post => post.parent_id)

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-[#3D405B]">Community Forum</h2>
      <div className="mb-8">
        {replyTo && (
          <div className="mb-4 p-3 bg-[#F2CC8F] border border-[#3D405B] rounded-lg">
            <p className="text-sm text-[#3D405B]">Replying to <strong>{replyTo.user_name}</strong></p>
            <button
              onClick={() => { setReplyTo(null); setNewPost('') }}
              className="text-xs text-[#3D405B] hover:text-[#81B29A] mt-1"
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
            className="flex-1 px-4 py-2 border border-[#3D405B] rounded-md focus:outline-none focus:ring-2 focus:ring-[#81B29A]"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-[#81B29A] text-white rounded-md hover:bg-[#71a28a] disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {parentPosts.length === 0 ? (
          <p className="text-[#3D405B] text-center py-8">No posts yet. Be the first to post!</p>
        ) : (
          parentPosts.map((post) => (
            <div key={post.id} className="p-4 border border-[#3D405B] rounded-lg bg-[#F4F1DE]">
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-[#3D405B]">{post.user_name}</span>
                <span className="text-xs text-[#3D405B]">{new Date(post.created_at).toLocaleString()}</span>
              </div>
              <p className="text-[#3D405B]">{renderContent(post.content)}</p>
              <button
                onClick={() => handleReply(post)}
                className="mt-2 text-sm text-[#81B29A] hover:text-[#71a28a] hover:underline"
              >
                Reply
              </button>
              {replies.filter(reply => reply.parent_id === post.id).map((reply) => (
                <div key={reply.id} className="mt-3 ml-6 p-3 border-l-2 border-[#81B29A] bg-white rounded">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-[#3D405B] text-sm">{reply.user_name}</span>
                    <span className="text-xs text-[#3D405B]">{new Date(reply.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-[#3D405B] text-sm">{renderContent(reply.content)}</p>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function ProfileSection({ user, onSuccess, existingProfile }: { user: any; onSuccess: () => void; existingProfile: ResidentProfile | null }) {
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
    console.log('=== Saving profile ===')
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
          role: 'barangay_official',
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
      <h2 className="text-2xl font-bold mb-6 text-[#3D405B]">Personal Information</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-[#3D405B] mb-1">Full Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-[#3D405B] rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#3D405B] mb-1">Username</label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className="w-full px-3 py-2 border border-[#3D405B] rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#3D405B] mb-1">Address</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-3 py-2 border border-[#3D405B] rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#3D405B] mb-1">Phone Number</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '')
              if (value.length <= 11) {
                setFormData({ ...formData, phone: value })
              }
            }}
            maxLength={11}
            pattern="[0-9]{11}"
            title="Please enter exactly 11 digits"
            className="w-full px-3 py-2 border border-[#3D405B] rounded-md"
            required
          />
          <p className="text-xs text-[#3D405B] mt-1">Exactly 11 digits required</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#3D405B] mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border border-[#3D405B] rounded-md"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-[#81B29A] text-white rounded-md hover:bg-[#71a28a] disabled:opacity-50"
        >
          {loading ? 'Saving...' : existingProfile ? 'Update Profile' : 'Create Profile'}
        </button>
      </form>
    </div>
  )
}
