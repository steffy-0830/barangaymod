'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

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

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<UserRole>('resident')
  const [isLogin, setIsLogin] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false)

  useEffect(() => {
    checkCurrentUser()
  }, [])

  const checkCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
    setIsCurrentUserAdmin(user?.user_metadata?.role === 'admin')
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (!isLogin && password !== confirmPassword) {
        throw new Error('Passwords do not match')
      }

      if (isLogin) {
        let loginEmail = email
        let loginUsername = email
        if (!email.includes('@')) {
          const { data } = await supabase
            .from('resident_profiles')
            .select('email, username')
            .eq('username', email)
            .single()
          if (!data) throw new Error('Username not found')
          loginEmail = data.email
          loginUsername = data.username
        }
        const { data: authData, error } = await supabase.auth.signInWithPassword({ 
          email: loginEmail, 
          password 
        })
        if (error) throw error
        if (authData.user) {
          await logActivity('Login', authData.user.id, loginUsername, 'User logged in')
        }
      } else {
        if (!username.trim()) throw new Error('Username is required')
        
        const { data: existingUsername } = await supabase
          .from('resident_profiles')
          .select('username')
          .eq('username', username)
          .single()
        if (existingUsername) throw new Error('Username already taken')

        const selectedRole = isCurrentUserAdmin ? role : 'resident'
        const { data: authData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: selectedRole,
              username: username
            }
          }
        })
        if (error) throw error
        if (authData.user) {
          await logActivity('Register', authData.user.id, username, `Registered as ${selectedRole}`)
        }
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F1DE]">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-[#3D405B]">
          {isLogin ? 'Login' : 'Register'}
        </h1>
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#3D405B] mb-1">
              {isLogin ? 'Email or Username' : 'Email'}
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-[#3D405B] rounded-md focus:outline-none focus:ring-2 focus:ring-[#81B29A]"
              required
            />
          </div>
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-[#3D405B] mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-[#3D405B] rounded-md focus:outline-none focus:ring-2 focus:ring-[#81B29A]"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-[#3D405B] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-[#3D405B] rounded-md focus:outline-none focus:ring-2 focus:ring-[#81B29A]"
              required
            />
          </div>
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-[#3D405B] mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-[#3D405B] rounded-md focus:outline-none focus:ring-2 focus:ring-[#81B29A]"
                  required
                />
              </div>
              {isCurrentUserAdmin && (
                <div>
                  <label className="block text-sm font-medium text-[#3D405B] mb-1">Account Type</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-[#3D405B] rounded-md focus:outline-none focus:ring-2 focus:ring-[#81B29A]"
                  >
                    <option value="resident">Resident</option>
                    <option value="barangay_official">Barangay Official</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}
            </>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#81B29A] text-white py-2 rounded-md hover:bg-[#71a28a] disabled:opacity-50"
          >
            {loading ? 'Loading...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-[#3D405B]">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-[#E07A5F] hover:underline"
          >
            {isLogin ? 'Register' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  )
}