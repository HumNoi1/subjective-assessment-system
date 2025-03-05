// File: lib/supabase-admin.js
import { createClient } from '@supabase/supabase-js'

// ไฟล์นี้ควรถูกเรียกใช้เฉพาะในฝั่ง server เท่านั้น
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    // เพิ่ม global option นี้เพื่อข้าม RLS
    global: {
      headers: {
        // Header นี้ช่วยให้ service role สามารถข้าม Row Level Security ได้
        'x-supabase-auth-bypass-rls': 'true'
      }
    }
  }
)