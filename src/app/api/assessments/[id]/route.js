// src/app/api/assessments/[id]/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// ดึงข้อมูลการประเมินเฉพาะ
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('assessments')
      .select(`
        *,
        student_answers (
          *,
          students (name)
        ),
        answer_keys (
          *,
          subjects (subject_name)
        )
      `)
      .eq('assessment_id', id)
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ assessment: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// อัพเดทข้อมูลการประเมิน
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const { score, feedbackText, confidence } = await request.json();
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('assessments')
      .update({ 
        score,
        feedback_text: feedbackText,
        confidence
      })
      .eq('assessment_id', id)
      .select();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ 
      message: 'อัพเดทข้อมูลการประเมินสำเร็จ',
      assessment: data[0]
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ลบการประเมิน
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    const supabase = await createServerClient();
    
    const { error } = await supabase
      .from('assessments')
      .delete()
      .eq('assessment_id', id);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ message: 'ลบการประเมินสำเร็จ' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}