import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// ดึงโฟลเดอร์ตามวิขาเรียน
export async function GET(request, { param }) {
  try {
    const { subjectId } = param;

    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('folders')
      .select('*, teachers(name)')
      .eq('subject_id', subjectId)
      .order('creation_date', { ascending: false });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400});
    }

    return NextResponse.json({ folders: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500});
  }
}

// อัพเดทข้อมูลวิชาเรียน
export async function PUT(request, { params }) {
  try {
    const { subjectId } = params;
    const { subjectName, subjectCode, teacherId, classId } = await request.json();
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('subjects')
      .update({ 
        subject_name: subjectName,
        subject_code: subjectCode,
        teacher_id: teacherId,
        class_id: classId
      })
      .eq('subject_id', subjectId)
      .select();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ 
      message: 'อัพเดทวิชาเรียนสำเร็จ',
      subject: data[0]
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ลบวิชาเรียน
export async function DELETE(request, { params }) {
  try {
    const { subjectId } = params;
    
    const supabase = await createServerClient();
    
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('subject_id', subjectId);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ message: 'ลบวิชาเรียนสำเร็จ' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}