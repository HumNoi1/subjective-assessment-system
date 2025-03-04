// File: app/api/classes/[id]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-admin';

// GET - ดึงข้อมูลเทอมที่ระบุ id
export async function GET(request, { params }) {
    const { id } = params;
  
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', id)
      .single();
  
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Semester not found' }, { status: 404 });
    
    return NextResponse.json(data);
  }
  
  // PUT - อัปเดตข้อมูลเทอม
  export async function PUT(request, { params }) {
    const { id } = params;
    const body = await request.json();
  
    const { data, error } = await supabase
      .from('assignments')
      .update(body)
      .eq('id', id)
      .select();
  
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data[0]);
  }
  
  // DELETE - ลบเทอม
  export async function DELETE(request, { params }) {
    const { id } = params;
  
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', id);
  
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: 'Semester deleted successfully' });
  }