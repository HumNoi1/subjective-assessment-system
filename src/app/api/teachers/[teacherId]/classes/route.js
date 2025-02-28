import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// ดึงชั้นเรียนที่อาจารย์รับผิดชอบ
export async function GET(request, { params }) {
  try {
    const { teacherId } = params;
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('academic_year', { ascending: false });
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ classes: data });
    
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}