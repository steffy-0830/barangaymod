'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Auth from '../components/Auth'
import Dashboard from '../components/Dashboard'
import AdminDashboard from '../components/AdminDashboard'
import PersonnelDashboard from '../components/PersonnelDashboard'

type UserRole = 'resident' | 'barangay_official' | 'admin'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: any, session: any) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

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
