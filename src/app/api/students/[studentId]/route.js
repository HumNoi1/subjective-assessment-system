import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// ดึงข้อมูลนักเรียนรายบุคคล
export async function GET(request, { params }) {
  try {
    const { studentId } = params;
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('students')
      .select('*, classes(class_name)')
      .eq('student_id', studentId)
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ student: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// อัพเดทข้อมูลนักเรียน
export async function PUT(request, { params }) {
  try {
    const { studentId } = params;
    const { name, email, classId } = await request.json();
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('students')
      .update({ 
        name, 
        email, 
        class_id: classId 
      })
      .eq('student_id', studentId)
      .select();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ 
      message: 'อัพเดทข้อมูลนักเรียนสำเร็จ',
      student: data[0]
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ลบข้อมูลนักเรียน
export async function DELETE(request, { params }) {
  try {
    const { studentId } = params;
    
    const supabase = await createServerClient();
    
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('student_id', studentId);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ message: 'ลบข้อมูลนักเรียนสำเร็จ' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}