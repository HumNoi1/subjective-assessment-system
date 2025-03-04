// File: app/api/classes/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-admin';

// GET - ดึงข้อมูลชั้นเรียนทั้งหมด (filterable)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');
  const semesterId = searchParams.get('semesterId');

  let query = supabase.from('classes').select('*').eq('teacher_id', teacherId);
  
  if (semesterId) {
    query = query.eq('semester_id', semesterId);
  }

  const { data, error } = await query.order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST - สร้างชั้นเรียนใหม่
export async function POST(request) {
  const body = await request.json();
  
  const { data, error } = await supabase
    .from('classes')
    .insert([body])
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data[0], { status: 201 });
}