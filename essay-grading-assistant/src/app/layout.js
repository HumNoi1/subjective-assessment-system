// File: app/layout.js
import { AuthProvider } from '@/components/AuthProvider'
import './globals.css'

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}