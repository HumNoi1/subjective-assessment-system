import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// สร้างวิชาเรียนใหม่
export async function POST(request) {
  try {
    const { subjectName, subjectCode, teacherId, classId } = await request.json();
    
    if (!subjectName || !subjectCode || !teacherId || !classId) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('subjects')
      .insert([{ 
        subject_name: subjectName,
        subject_code: subjectCode,
        teacher_id: teacherId,
        class_id: classId
      }])
      .select();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ 
      message: 'สร้างวิชาเรียนสำเร็จ',
      subject: data[0]
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ดึงรายการวิชาเรียนทั้งหมด
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const classId = searchParams.get('classId');
    
    const supabase = await createServerClient();
    
    let query = supabase.from('subjects')
      .select('*, teachers(name), classes(class_name)');
    
    if (teacherId) {
      query = query.eq('teacher_id', teacherId);
    }
    
    if (classId) {
      query = query.eq('class_id', classId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ subjects: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}