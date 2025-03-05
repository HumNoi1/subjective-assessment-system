// File: app/register/page.js
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 1. สร้างบัญชีผู้ใช้ใหม่
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name
          }
        }
      })

      if (authError) throw authError

      if (!authData?.user?.id) {
        throw new Error('ไม่สามารถสร้างบัญชีผู้ใช้ได้')
      }

      // 2. สร้างข้อมูลอาจารย์ในตาราง teachers โดยใช้ ID เดียวกับระบบ auth
      const { error: profileError } = await supabase
        .from('teachers')
        .insert([{ 
          id: authData.user.id, 
          email, 
          name,
          created_at: new Date()
        }])

      if (profileError) throw profileError

      setSuccess(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch (err) {
      console.error('Registration error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold">ลงทะเบียนอาจารย์</h1>
        
        {error && (
          <div className="mb-4 rounded bg-red-100 p-3 text-red-800">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 rounded bg-green-100 p-3 text-green-800">
            ลงทะเบียนสำเร็จ กำลังนำคุณไปยังหน้าเข้าสู่ระบบ...
          </div>
        )}
        
        <form onSubmit={handleRegister}>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium" htmlFor="name">
              ชื่อ-นามสกุล
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium" htmlFor="email">
              อีเมล
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium" htmlFor="password">
              รหัสผ่าน
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2"
              minLength="6"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน'}
          </button>
          
          <div className="mt-4 text-center text-sm">
            มีบัญชีอยู่แล้ว? <Link href="/login" className="text-blue-600 hover:underline">เข้าสู่ระบบ</Link>
          </div>
        </form>
      </div>
    </div>
  )
}