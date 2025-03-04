// File: app/api/subjects/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-admin';

// GET - ดึงข้อมูลวิชาทั้งหมด (filterable)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');
  const classId = searchParams.get('classId');

  let query = supabase.from('subjects').select('*').eq('teacher_id', teacherId);
  
  if (classId) {
    query = query.eq('class_id', classId);
  }

  const { data, error } = await query.order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST - สร้างวิชาใหม่
export async function POST(request) {
  const body = await request.json();
  
  const { data, error } = await supabase
    .from('subjects')
    .insert([body])
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data[0], { status: 201 });
}