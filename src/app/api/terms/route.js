import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// สร้างเทอมเรียนใหม่
export async function POST(request) {
  try {
    const { termName, startDate, endDate } = await request.json();
    
    if (!termName || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('terms')
      .insert([{ 
        term_name: termName,
        start_date: startDate,
        end_date: endDate
      }])
      .select();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ 
      message: 'สร้างเทอมเรียนสำเร็จ',
      term: data[0]
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ดึงรายการเทอมเรียนทั้งหมด
export async function GET() {
  try {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('terms')
      .select('*')
      .order('start_date', { ascending: false });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ terms: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}