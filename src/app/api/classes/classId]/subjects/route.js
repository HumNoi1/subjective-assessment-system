import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// ดึงวิชาสำหรับชั้นเรียนนั้นๆ
export async function GET(request, { params }) {
  try {
    const { classId } = params;
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('subjects')
      .select('*, teachers(name)')
      .eq('class_id', classId);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ subjects: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}