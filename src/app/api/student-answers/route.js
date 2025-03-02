// src/app/api/student-answers/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { createEmbeddings } from '@/lib/llm';
import { getMilvusClient } from '@/lib/milvus';
import { extractTextFromPDF } from '@/lib/pdf';

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
    
    // ตรวจสอบประเภทไฟล์และดึงเนื้อหา
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const isPDF = fileExtension === 'pdf';
    let fileContent;
    
    const fileBuffer = await file.arrayBuffer();
    
    if (isPDF) {
      // สำหรับไฟล์ PDF ให้ใช้ extractTextFromPDF
      fileContent = await extractTextFromPDF(fileBuffer);
    } else {
      // สำหรับไฟล์ข้อความปกติ
      fileContent = new TextDecoder('utf-8').decode(new Uint8Array(fileBuffer));
    }
    
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
          milvus_collection_name: 'student_answer_embeddings',
          has_embeddings: false // จะอัปเดตเป็น true หลังจากสร้าง embeddings
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
    try {
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
            answer_key_id: answerKeyId,
            folder_id: folderId
          })
        }]
      });
      
      // อัพเดทสถานะ has_embeddings เป็น true
      await supabase
        .from('student_answers')
        .update({ 
          has_embeddings: true,
          updated_at: new Date().toISOString()
        })
        .eq('student_answer_id', studentAnswerId);
      
      // อัพเดตข้อมูลที่จะส่งกลับให้มี has_embeddings เป็น true
      studentAnswerData[0].has_embeddings = true;
    } catch (embeddingError) {
      console.error('Error creating embeddings:', embeddingError);
      // ไม่ส่ง error กลับไปเพื่อให้การอัปโหลดไฟล์สำเร็จ แม้ว่าการสร้าง embeddings จะล้มเหลว
    }
    
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

// ดึงรายการคำตอบของนักเรียนทั้งหมด (คงเดิม)
export async function GET(request) {
  // ...ส่วนของฟังก์ชัน GET คงเดิม...
}