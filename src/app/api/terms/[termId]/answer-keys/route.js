// src/app/api/terms/[termId]/answer-keys/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// ดึงไฟล์เฉลยตามเทอมเรียน
export async function GET(request, { params }) {
  try {
    const { termId } = params;
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('answer_keys')
      .select('*, subjects(subject_name)')
      .eq('term_id', termId);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ answerKeys: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}