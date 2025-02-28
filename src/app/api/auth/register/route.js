import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();
    
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    // สร้างผู้ใช้ใน Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }
    
    // เพิ่มข้อมูลอาจารย์ในตาราง teachers
    const { data: teacherData, error: teacherError } = await supabase
      .from('teachers')
      .insert([
        { 
          name, 
          email,
          user_id: authData.user.id 
        }
      ])
      .select();
    
    if (teacherError) {
      return NextResponse.json(
        { error: teacherError.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ 
      message: 'ลงทะเบียนสำเร็จ',
      teacher: teacherData[0]
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}