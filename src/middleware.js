// src/middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  try {
    // ตรวจสอบว่าเป็น API route หรือไม่
    if (request.nextUrl.pathname.startsWith('/api/')) {
      // กำหนด headers เพื่อรองรับ UTF-8
      const response = NextResponse.next();
      response.headers.set('Accept-Charset', 'utf-8');
      
      // เพิ่ม error handling headers
      response.headers.set('X-Error-Handling', 'enabled');
      
      return response;
    }
    
    // สำหรับเส้นทางอื่น ๆ ให้ส่งต่อคำขอตามปกติ
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

// กำหนดเส้นทางที่ต้องการใช้ middleware
export const config = {
  matcher: ['/api/:path*'],
};