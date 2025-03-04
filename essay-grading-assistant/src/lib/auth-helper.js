// File: lib/auth-helper.js
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function withAuth(handler) {
  return async (req, context) => {
    const { data: session } = await supabase.auth.getSession()
    
    if (!session?.session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // เพิ่ม user ID เข้าไปใน context
    context.userId = session.session.user.id
    
    return handler(req, context)
  }
}