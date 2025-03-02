// src/app/api/student-answers/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { createEmbeddings } from '@/lib/llm';
import { getMilvusClient } from '@/lib/milvus';

// อัปโหลดคำตอบของนักเรียนใหม่
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const studentId = formData.get('studentId');
    const answerKeyId = formData.get('answerKeyId');
    const folderId = formData.get('folderId');
    
    if (!file || !studentId || !answerKeyId || !folderId) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }
    
    // อ่านเนื้อหาไฟล์
    const fileBuffer = await file.arrayBuffer();
    const fileContent = new TextDecoder('utf-8').decode(new Uint8Array(fileBuffer));
    
    const supabase = await createServerClient();
    
    // บันทึกข้อมูลคำตอบนักเรียนในตาราง student_answers
    const { data: studentAnswerData, error: studentAnswerError } = await supabase
      .from('student_answers')
      .insert([
        { 
          file_name: file.name,
          content: fileContent,
          file_size: file.size,
          student_id: studentId,
          answer_key_id: answerKeyId,
          folder_id: folderId,
          milvus_collection_name: 'student_answer_embeddings'
        }
      ])
      .select();
    
    if (studentAnswerError) {
      return NextResponse.json(
        { error: studentAnswerError.message },
        { status: 400 }
      );
    }
    
    const studentAnswerId = studentAnswerData[0].student_answer_id;
    
    // สร้าง embeddings และบันทึกใน Milvus
    const embedding = await createEmbeddings(fileContent);
      
    const milvusClient = await getMilvusClient();
    await milvusClient.insert({
      collection_name: 'student_answer_embeddings',
      fields_data: [{
        student_answer_id: studentAnswerId,
        content_chunk: fileContent,
        embedding: embedding,
        metadata: JSON.stringify({
          file_name: file.name,
          student_id: studentId,
          answer_key_id: answerKeyId
        })
      }]
    });
    
    return NextResponse.json({ 
      message: 'อัปโหลดคำตอบของนักเรียนสำเร็จ',
      studentAnswer: studentAnswerData[0]
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// ดึงรายการคำตอบของนักเรียนทั้งหมด
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const answerKeyId = searchParams.get('answerKeyId');
    const folderId = searchParams.get('folderId');
    
    const supabase = await createServerClient();
    
    let query = supabase
      .from('student_answers')
      .select('*, students(name), answer_keys(file_name, subjects(subject_name)), folders(folder_name)');
    
    if (studentId) {
      query = query.eq('student_id', studentId);
    }
    
    if (answerKeyId) {
      query = query.eq('answer_key_id', answerKeyId);
    }
    
    if (folderId) {
      query = query.eq('folder_id', folderId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ studentAnswers: data });
    
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}