// File: app/api/semesters/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-admin';

// GET - ดึงข้อมูลเทอมทั้งหมดของอาจารย์ที่ login
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');

  const { data, error } = await supabase
    .from('semesters')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('year', { ascending: false })
    .order('name', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST - สร้างเทอมใหม่
export async function POST(request) {
  const body = await request.json();
  
  const { data, error } = await supabase
    .from('semesters')
    .insert([body])
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data[0], { status: 201 });
}