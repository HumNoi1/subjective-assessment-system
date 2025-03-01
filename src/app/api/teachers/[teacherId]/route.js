import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    const { teacherId } = params;
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('teacher_id', teacherId)
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ teacher: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
    try {
      const { teacherId } = params;
      const { name, email } = await request.json();
      
      const supabase = await createServerClient();
      
      const { data, error } = await supabase
        .from('teachers')
        .update({ name, email })
        .eq('teacher_id', teacherId)
        .select();
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      
      return NextResponse.json({ 
        message: 'อัพเดทข้อมูลอาจารย์สำเร็จ',
        teacher: data[0]
      });
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }