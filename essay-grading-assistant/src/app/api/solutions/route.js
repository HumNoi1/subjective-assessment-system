// File: app/api/solutions/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-admin';

// GET - ดึงข้อมูลเฉลยทั้งหมด (filterable)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');
  const assignmentId = searchParams.get('assignmentId');

  let query = supabase.from('solutions').select('*').eq('teacher_id', teacherId);
  
  if (assignmentId) {
    query = query.eq('assignment_id', assignmentId);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST - อัปโหลดเฉลยใหม่
export async function POST(request) {
  const body = await request.json();
  
  // ตรวจสอบว่าเฉลยของงานนี้มีอยู่แล้วหรือไม่
  const { data: existingSolution } = await supabase
    .from('solutions')
    .select('id')
    .eq('assignment_id', body.assignment_id)
    .single();

  if (existingSolution) {
    // ถ้ามีอยู่แล้ว ให้อัปเดตแทนที่จะสร้างใหม่
    const { data, error } = await supabase
      .from('solutions')
      .update({
        file_path: body.file_path,
        file_name: body.file_name,
        uploaded_at: new Date()
      })
      .eq('id', existingSolution.id)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data[0], { status: 200 });
  } else {
    // ถ้ายังไม่มี ให้สร้างใหม่
    const { data, error } = await supabase
      .from('solutions')
      .insert([body])
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data[0], { status: 201 });
  }
}