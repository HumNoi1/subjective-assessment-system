// File: app/api/storage/folders/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-admin';

// สร้างโฟลเดอร์ใหม่ (โดยการอัปโหลดไฟล์ dummy เพื่อสร้างโฟลเดอร์)
export async function POST(request) {
  const { teacherId, assignmentId, studentId = null, type } = await request.json();
  
  try {
    const dummyFile = new Uint8Array(0); // ไฟล์ว่าง
    const bucket = type === 'solution' ? 'teacher_solutions' : 'student_submissions';
    
    let filePath;
    if (type === 'solution') {
      filePath = `${teacherId}/${assignmentId}/.folder`;
    } else {
      filePath = `${teacherId}/${assignmentId}/${studentId}/.folder`;
    }
    
    // อัปโหลดไฟล์ dummy เพื่อสร้างโฟลเดอร์
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, dummyFile, {
        contentType: 'application/x-empty',
        upsert: true
      });
      
    if (error) throw error;
    
    return NextResponse.json({ 
      success: true, 
      path: filePath 
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message }, 
      { status: 500 }
    );
  }
}

// ดึงรายการไฟล์ในโฟลเดอร์
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');
  const assignmentId = searchParams.get('assignmentId');
  const studentId = searchParams.get('studentId');
  const type = searchParams.get('type') || 'solution';
  
  try {
    const bucket = type === 'solution' ? 'teacher_solutions' : 'student_submissions';
    let path = `${teacherId}/${assignmentId}`;
    
    if (type === 'submission' && studentId) {
      path = `${teacherId}/${assignmentId}/${studentId}`;
    }
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path);
      
    if (error) throw error;
    
    // กรองไฟล์ .folder ออก
    const files = data.filter(file => file.name !== '.folder');
    
    return NextResponse.json(files);
  } catch (error) {
    return NextResponse.json(
      { error: error.message }, 
      { status: 500 }
    );
  }
}