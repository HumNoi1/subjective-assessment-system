// File: app/api/assignments/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-admin';

// GET - ดึงข้อมูลงานทั้งหมด (filterable)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');
  const subjectId = searchParams.get('subjectId');

  let query = supabase.from('assignments').select('*').eq('teacher_id', teacherId);
  
  if (subjectId) {
    query = query.eq('subject_id', subjectId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST - สร้างงานใหม่
export async function POST(request) {
  const body = await request.json();
  
  const { data, error } = await supabase
    .from('assignments')
    .insert([body])
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data[0], { status: 201 });
}