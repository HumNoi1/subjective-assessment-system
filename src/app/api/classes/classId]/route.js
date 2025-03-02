import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// ดึงข้อมูลชั้นเรียนเฉพาะ
export async function GET(request, { params }) {
  try {
    const { class_id } = params;
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('class_id', class_id)
      .single();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ class: data });
    
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// อัพเดทข้อมูลชั้นเรียน
export async function PUT(request, { params }) {
  try {
    const { class_id } = params;
    const { className, academicYear } = await request.json();
    
    if (!className || !academicYear) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('classes')
      .update({ 
        class_name: className, 
        academic_year: academicYear 
      })
      .eq('class_id', class_id)
      .select();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ 
      message: 'อัพเดทชั้นเรียนสำเร็จ',
      class: data[0]
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// ลบชั้นเรียน
export async function DELETE(request, { params }) {
  try {
    const { class_id } = params;
    
    const supabase = await createServerClient();
    
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('class_id', class_id);
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ 
      message: 'ลบชั้นเรียนสำเร็จ' 
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}