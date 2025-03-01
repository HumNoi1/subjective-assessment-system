// src/app/embeddings/student-answer/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getMilvusClient } from '@/lib/milvus';
import { createEmbeddings } from '@/lib/llm';

export async function POST(request) {
  try {
    const { studentAnswerId, recreate = false } = await request.json();
    
    if (!studentAnswerId) {
      return NextResponse.json(
        { error: 'กรุณาระบุ ID ของคำตอบนักเรียน' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    // ดึงข้อมูลคำตอบนักเรียน
    const { data: studentAnswerData, error: studentAnswerError } = await supabase
      .from('student_answers')
      .select('*')
      .eq('student_answer_id', studentAnswerId)
      .single();
    
    if (studentAnswerError) {
      return NextResponse.json(
        { error: studentAnswerError.message },
        { status: 400 }
      );
    }
    
    const milvusClient = await getMilvusClient();
    
    if (recreate) {
      // ลบ embeddings เก่า (ถ้ามี)
      await milvusClient.delete({
        collection_name: 'student_answer_embeddings',
        filter: `student_answer_id == ${studentAnswerId}`
      });
    } else {
      // ตรวจสอบว่ามี embeddings อยู่แล้วหรือไม่
      const searchResults = await milvusClient.search({
        collection_name: 'student_answer_embeddings',
        filter: `student_answer_id == ${studentAnswerId}`,
        limit: 1
      });
      
      if (searchResults.results.length > 0) {
        return NextResponse.json({ 
          message: 'Embeddings มีอยู่แล้วสำหรับคำตอบนักเรียนนี้',
          exists: true,
          count: searchResults.results.length
        });
      }
    }
    
    // สร้าง embedding
    const embedding = await createEmbeddings(studentAnswerData.content);
    
    // บันทึกลงใน Milvus
    await milvusClient.insert({
      collection_name: 'student_answer_embeddings',
      fields_data: [{
        student_answer_id: studentAnswerId,
        content_chunk: studentAnswerData.content,
        embedding: embedding,
        metadata: JSON.stringify({
          file_name: studentAnswerData.file_name,
          student_id: studentAnswerData.student_id,
          answer_key_id: studentAnswerData.answer_key_id,
          folder_id: studentAnswerData.folder_id
        })
      }]
    });
    
    // อัพเดทสถานะใน Supabase ว่ามี embeddings แล้ว
    await supabase
      .from('student_answers')
      .update({ 
        has_embeddings: true,
        updated_at: new Date().toISOString()
      })
      .eq('student_answer_id', studentAnswerId);
    
    return NextResponse.json({ 
      message: 'สร้าง embedding สำหรับคำตอบนักเรียนสำเร็จ'
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}