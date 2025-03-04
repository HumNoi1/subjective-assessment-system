// File: lib/supabase-admin.js
import { createClient } from '@supabase/supabase-js'

// ไฟล์นี้ควรถูกเรียกใช้เฉพาะในฝั่ง server เท่านั้น
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)