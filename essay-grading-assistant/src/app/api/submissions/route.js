// File: app/api/submissions/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-admin';

// GET - ดึงข้อมูลงานที่นักเรียนส่งทั้งหมด (filterable)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');
  const assignmentId = searchParams.get('assignmentId');
  const studentId = searchParams.get('studentId');

  let query = supabase.from('student_submissions').select('*').eq('teacher_id', teacherId);
  
  if (assignmentId) {
    query = query.eq('assignment_id', assignmentId);
  }
  
  if (studentId) {
    query = query.eq('student_id', studentId);
  }

  const { data, error } = await query.order('uploaded_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST - บันทึกงานที่นักเรียนส่ง
export async function POST(request) {
  const body = await request.json();
  
  const { data, error } = await supabase
    .from('student_submissions')
    .insert([body])
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data[0], { status: 201 });
}