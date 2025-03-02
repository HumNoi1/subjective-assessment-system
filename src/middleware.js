import { NextResponse } from 'next/server';

export function middleware(request) {
  // Handle UTF-8 encoding for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    response.headers.set('Accept-Charset', 'utf-8');
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};