import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// ดึงข้อมูลเทอมเรียนเฉพาะ
export async function GET(request, { params }) {
  try {
    const { termId } = params;
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('terms')
      .select('*')
      .eq('term_id', termId)
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ term: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// อัพเดทข้อมูลเทอมเรียน
export async function PUT(request, { params }) {
  try {
    const { termId } = params;
    const { termName, startDate, endDate } = await request.json();
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('terms')
      .update({ 
        term_name: termName,
        start_date: startDate,
        end_date: endDate
      })
      .eq('term_id', termId)
      .select();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ 
      message: 'อัพเดทเทอมเรียนสำเร็จ',
      term: data[0]
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ลบเทอมเรียน
export async function DELETE(request, { params }) {
  try {
    const { termId } = params;
    
    const supabase = await createServerClient();
    
    const { error } = await supabase
      .from('terms')
      .delete()
      .eq('term_id', termId);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ message: 'ลบเทอมเรียนสำเร็จ' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}