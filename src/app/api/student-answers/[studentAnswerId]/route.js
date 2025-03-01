// src/app/api/student-answers/[id]/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getMilvusClient } from '@/lib/milvus';
import { createEmbeddings } from '@/lib/llm';

// ดึงข้อมูลคำตอบของนักเรียนเฉพาะ
export async function GET(request, { params }) {
  try {
    const { studentAnswerId } = params;
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('student_answers')
      .select('*, students(name), answer_keys(file_name), folders(folder_name)')
      .eq('student_answer_id', studentAnswerId)
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ studentAnswer: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// อัพเดทข้อมูลคำตอบของนักเรียน
export async function PUT(request, { params }) {
  try {
    const { studentAnswerId } = params;
    const formData = await request.formData();
    const file = formData.get('file');
    const studentId = formData.get('studentId');
    const answerKeyId = formData.get('answerKeyId');
    const folderId = formData.get('folderId');
    
    if (!studentId || !answerKeyId || !folderId) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    // เตรียมข้อมูลสำหรับอัพเดท
    const updateData = {
      student_id: studentId,
      answer_key_id: answerKeyId,
      folder_id: folderId,
      updated_at: new Date().toISOString()
    };
    
    // ถ้ามีการอัปโหลดไฟล์ใหม่
    if (file) {
      const fileContent = await file.text();
      
      updateData.file_name = file.name;
      updateData.content = fileContent;
      updateData.file_size = file.size;
      
      // อัพเดทข้อมูลใน Supabase
      const { data, error } = await supabase
        .from('student_answers')
        .update(updateData)
        .eq('student_answer_id', studentAnswerId)
        .select();
      
      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      
      // ลบ embeddings เก่าจาก Milvus
      const milvusClient = await getMilvusClient();
      await milvusClient.delete({
        collection_name: 'student_answer_embeddings',
        filter: `student_answer_id == ${studentAnswerId}`
      });
      
      // สร้าง embeddings ใหม่
      const embedding = await createEmbeddings(fileContent);
      
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
        message: 'อัพเดทคำตอบของนักเรียนและ embeddings สำเร็จ',
        studentAnswer: data[0]
      });
    } else {
      // กรณีไม่มีการอัพเดทไฟล์ เพียงแค่อัพเดทข้อมูลอื่น
      const { data, error } = await supabase
        .from('student_answers')
        .update(updateData)
        .eq('student_answer_id', studentAnswerId)
        .select();
      
      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      
      return NextResponse.json({ 
        message: 'อัพเดทข้อมูลคำตอบของนักเรียนสำเร็จ',
        studentAnswer: data[0]
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// ลบคำตอบของนักเรียน
export async function DELETE(request, { params }) {
  try {
    const { studentAnswerId } = params;
    
    const supabase = await createServerClient();
    const milvusClient = await getMilvusClient();
    
    // ลบ embeddings จาก Milvus ก่อน
    await milvusClient.delete({
      collection_name: 'student_answer_embeddings',
      filter: `student_answer_id == ${studentAnswerId}`
    });
    
    // ลบข้อมูลจาก Supabase
    const { error } = await supabase
      .from('student_answers')
      .delete()
      .eq('student_answer_id', studentAnswerId);
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ message: 'ลบคำตอบของนักเรียนสำเร็จ' });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}