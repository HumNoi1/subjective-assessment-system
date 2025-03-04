// File: app/api/grades/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-admin';

// GET - ดึงข้อมูลคะแนนทั้งหมด (filterable)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');
  const submissionId = searchParams.get('submissionId');

  let query = supabase.from('grades').select('*').eq('teacher_id', teacherId);
  
  if (submissionId) {
    query = query.eq('submission_id', submissionId);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST - บันทึกคะแนนและข้อเสนอแนะ
export async function POST(request) {
  const body = await request.json();
  
  // ตรวจสอบว่ามีคะแนนของงานนี้อยู่แล้วหรือไม่
  const { data: existingGrade } = await supabase
    .from('grades')
    .select('id')
    .eq('submission_id', body.submission_id)
    .single();

  if (existingGrade) {
    // ถ้ามีอยู่แล้ว ให้อัปเดตแทนที่จะสร้างใหม่
    const { data, error } = await supabase
      .from('grades')
      .update({
        score: body.score,
        max_score: body.max_score,
        feedback: body.feedback,
        llm_feedback: body.llm_feedback,
        graded_at: new Date()
      })
      .eq('id', existingGrade.id)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    
    // อัปเดตสถานะการตรวจงานในตาราง student_submissions
    await supabase
      .from('student_submissions')
      .update({ is_graded: true })
      .eq('id', body.submission_id);
    
    return NextResponse.json(data[0], { status: 200 });
  } else {
    // ถ้ายังไม่มี ให้สร้างใหม่
    const { data, error } = await supabase
      .from('grades')
      .insert([body])
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    
    // อัปเดตสถานะการตรวจงานในตาราง student_submissions
    await supabase
      .from('student_submissions')
      .update({ is_graded: true })
      .eq('id', body.submission_id);
    
    return NextResponse.json(data[0], { status: 201 });
  }
}