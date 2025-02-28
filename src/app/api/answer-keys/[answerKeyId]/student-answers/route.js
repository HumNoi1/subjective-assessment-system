// src/app/api/answer-keys/[answerKeyId]/student-answers/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// ดึงคำตอบตามไฟล์เฉลย
export async function GET(request, { params }) {
  try {
    const { answerKeyId } = params;
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('student_answers')
      .select('*, students(name), folders(folder_name)')
      .eq('answer_key_id', answerKeyId);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ studentAnswers: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}