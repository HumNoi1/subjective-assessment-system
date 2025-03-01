// src/app/api/students/[studentId]/assessments/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// ดึงการประเมินตามนักเรียน
export async function GET(request, { params }) {
  try {
    const { studentId } = params;
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('assessments')
      .select(`
        *,
        student_answers!inner (
          *,
          students!inner (
            student_id,
            name
          )
        ),
        answer_keys (
          *,
          subjects (subject_name)
        )
      `)
      .eq('student_answers.students.student_id', studentId);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ assessments: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}