import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// ดึงโฟลเดอร์ตามวิชาเรียน
export async function GET(request, { params }) {
  try {
    const { subjectId } = params;
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('folders')
      .select('*, teachers(name)')
      .eq('subject_id', subjectId)
      .order('creation_date', { ascending: false });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ folders: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}