// src/app/api/folders/[folderId]/student-answers/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// ดึงคำตอบตามโฟลเดอร์
export async function GET(request, { params }) {
  try {
    const { folderId } = params;
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('student_answers')
      .select('*, students(name), answer_keys(file_name, subjects(subject_name))')
      .eq('folder_id', folderId);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ studentAnswers: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}