import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอกอีเมลและรหัสผ่าน' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    // เข้าสู่ระบบผ่าน Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    // ดึงข้อมูลอาจารย์จากตาราง teachers
    const { data: teacherData, error: teacherError } = await supabase
      .from('teachers')
      .select('*')
      .eq('email', data.user.email)
      .single();
    
    if (teacherError) {
      return NextResponse.json(
        { error: teacherError.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ 
      message: 'เข้าสู่ระบบสำเร็จ',
      session: data.session,
      teacher: teacherData
    }); 
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}