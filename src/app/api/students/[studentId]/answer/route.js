// src/app/api/students/[studentId]/answers/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// ดึงคำตอบตามนักเรียน
export async function GET(request, { params }) {
  try {
    const { studentId } = params;
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('student_answers')
      .select('*, answer_keys(file_name, subjects(subject_name)), folders(folder_name)')
      .eq('student_id', studentId);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ studentAnswers: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}