// File: middleware.js
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // ถ้าไม่มี session และไม่ใช่หน้า login ให้ redirect ไปที่หน้า login
  if (!session && req.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}

// ระบุ path ที่ต้องการให้ middleware ทำงาน
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login).*)'],
}