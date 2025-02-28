import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// ดึงรายชื่อนักเรียนตามชั้นเรียน
export async function GET(request, { params }) {
  try {
    const { classId } = params;
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', classId);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ students: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}