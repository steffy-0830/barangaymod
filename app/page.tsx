'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Auth from '../components/Auth'
import Dashboard from '../components/Dashboard'
import AdminDashboard from '../components/AdminDashboard'
import PersonnelDashboard from '../components/PersonnelDashboard'

type UserRole = 'resident' | 'barangay_official' | 'admin'

const logActivity = async (action: string, user_id: string, user_name: string, details?: string) => {
  try {
    await supabase.from('activity_logs').insert({
      user_id,
      user_name,
      action,
      details
    })
  } catch (error) {
    console.error('Error logging activity:', error)
  }
}

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [hasLoggedSession, setHasLoggedSession] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: any, session: any) => {
        setUser(session?.user ?? null)
        setLoading(false)
        if (session?.user && !hasLoggedSession) {
          let user_name = session.user.email
          try {
            const { data } = await supabase
              .from('resident_profiles')
              .select('username')
              .eq('id', session.user.id)
              .maybeSingle()
            if (data?.username) {
              user_name = data.username
            }
          } catch (e) {
            console.error('Error fetching username:', e)
          }
          await logActivity('Login', session.user.id, user_name, 'User logged into dashboard')
          setHasLoggedSession(true)
        }
      }
    )

    supabase.auth.getSession().then(async ({ data: { session } }: { data: { session: any } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user && !hasLoggedSession) {
        let user_name = session.user.email
        try {
          const { data } = await supabase
            .from('resident_profiles')
            .select('username')
            .eq('id', session.user.id)
            .maybeSingle()
          if (data?.username) {
            user_name = data.username
          }
        } catch (e) {
          console.error('Error fetching username:', e)
        }
        await logActivity('Login', session.user.id, user_name, 'User logged into dashboard')
        setHasLoggedSession(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [hasLoggedSession])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return <Auth />
  }

  const userRole = (user.user_metadata?.role || 'resident') as UserRole

  if (userRole === 'admin') {
    return <AdminDashboard user={user} />
  }

  if (userRole === 'barangay_official') {
    return <PersonnelDashboard user={user} />
  }

  return <Dashboard user={user} />
}
