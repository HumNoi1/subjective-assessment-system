import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// สร้างโฟลเดอร์ใหม่
export async function POST(request) {
  try {
    const { folderName, teacherId, subjectId } = await request.json();
    
    if (!folderName || !teacherId || !subjectId) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('folders')
      .insert([{ 
        folder_name: folderName,
        teacher_id: teacherId,
        subject_id: subjectId,
        creation_date: new Date().toISOString()
      }])
      .select();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ 
      message: 'สร้างโฟลเดอร์สำเร็จ',
      folder: data[0]
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ดึงรายการโฟลเดอร์ทั้งหมด
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const subjectId = searchParams.get('subjectId');
    
    const supabase = await createServerClient();
    
    let query = supabase.from('folders')
      .select('*, teachers(name), subjects(subject_name)');
    
    if (teacherId) {
      query = query.eq('teacher_id', teacherId);
    }
    
    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }
    
    const { data, error } = await query.order('creation_date', { ascending: false });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ folders: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}