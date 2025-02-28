// src/app/api/subjects/[subjectId]/answer-keys/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// ดึงไฟล์เฉลยตามวิชาเรียน
export async function GET(request, { params }) {
  try {
    const { subjectId } = params;
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('answer_keys')
      .select('*, terms(term_name)')
      .eq('subject_id', subjectId);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ answerKeys: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}