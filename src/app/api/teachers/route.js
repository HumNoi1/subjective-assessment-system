import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// ดึงรายชื่ออาจารย์ทั้งหมด
export async function GET(request) {
  try {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('teachers')
      .select('*');
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ teachers: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}