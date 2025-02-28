import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const { teacherId } = await request.json();
    
    if (!teacherId) {
      return NextResponse.json(
        { error: 'กรุณาระบุ ID ของอาจารย์' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('assessments')
      .update({ 
        is_approved: true,
        approved_by: teacherId 
      })
      .eq('assessment_id', id)
      .select();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ 
      message: 'อนุมัติการประเมินสำเร็จ',
      assessment: data[0]
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}