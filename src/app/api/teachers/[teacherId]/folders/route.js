import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// ดึงโฟลเดอร์ที่อาจารย์สร้าง
export async function GET(request, { params }) {
  try {
    const { teacherId } = params;
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('folders')
      .select('*, subjects(subject_name)')
      .eq('teacher_id', teacherId)
      .order('creation_date', { ascending: false });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ folders: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}