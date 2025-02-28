import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// เพิ่มนักเรียนใหม่
export async function POST(request) {
  try {
    const { name, email, classId } = await request.json();
    
    if (!name || !email || !classId) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('students')
      .insert([{ 
        name, 
        email, 
        class_id: classId 
      }])
      .select();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ 
      message: 'เพิ่มนักเรียนสำเร็จ',
      student: data[0]
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ดึงรายชื่อนักเรียนทั้งหมด
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    
    const supabase = await createServerClient();
    
    let query = supabase.from('students').select('*, classes(class_name)');
    
    if (classId) {
      query = query.eq('class_id', classId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ students: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}