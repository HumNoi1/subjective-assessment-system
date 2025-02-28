import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// ดึงวิชาที่อาจารย์สอน
export async function GET(request, { params }) {
  try {
    const { teacherId } = params;
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('subjects')
      .select('*, classes(class_name)')
      .eq('teacher_id', teacherId);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ subjects: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}