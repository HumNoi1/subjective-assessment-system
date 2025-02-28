import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// ดึงข้อมูลอาจารย์ที่กำลังใช้งานระบบอยู่
export async function GET(request) {
  try {
    const supabase = await createServerClient();
    
    // ดึง session ปัจจุบัน
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'ไม่พบ session' }, { status: 401 });
    }
    
    // ดึงข้อมูลอาจารย์จาก user_id
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('user_id', session.user.id)
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ teacher: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}