import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// สร้างชั้นเรียนใหม่
export async function POST(request) {
  try {
    const { className, academicYear, teacherId } = await request.json();
    
    if (!className || !academicYear || !teacherId) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('classes')
      .insert([
        { 
          class_name: className, 
          academic_year: academicYear,
          teacher_id: teacherId 
        }
      ])
      .select();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ 
      message: 'สร้างชั้นเรียนสำเร็จ',
      class: data[0]
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// ดึงรายการชั้นเรียนทั้งหมด
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    
    const supabase = await createServerClient();
    
    let query = supabase.from('classes').select('*');
    
    // ถ้ามี teacherId ให้กรองตามอาจารย์
    if (teacherId) {
      query = query.eq('teacher_id', teacherId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ classes: data });
    
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}