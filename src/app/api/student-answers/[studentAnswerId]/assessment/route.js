// src/app/api/student-answers/[studentAnswerId]/assessment/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// ดึงการประเมินตามคำตอบนักเรียน
export async function GET(request, { params }) {
  try {
    const { studentAnswerId } = params;
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('student_answer_id', studentAnswerId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ 
          message: 'ไม่พบการประเมินสำหรับคำตอบนี้',
          exists: false 
        });
      }
      
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ 
      assessment: data,
      exists: true
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}