// src/app/api/student-answers/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { createEmbeddings } from '@/lib/llm';
import { getMilvusClient } from '@/lib/milvus';
import { extractTextFromPDF } from '@/lib/pdf';
import { createDocumentFromText, createIndexWithChunks } from '@/lib/llamaindex';
import { setCache } from '@/lib/cache';

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
          has_embeddings: false, // จะอัปเดตเป็น true หลังจากสร้าง embeddings
          llamaindex_processed: false // จะอัปเดตเป็น true หลังจากประมวลผลด้วย LlamaIndex
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
    
    // ประมวลผลด้วย LlamaIndex และสร้าง embeddings พร้อมกัน
    try {
      // 1. สร้าง LlamaIndex document และ index
      const metadata = {
        studentAnswerId: studentAnswerId,
        fileName: file.name,
        studentId: studentId,
        answerKeyId: answerKeyId,
        folderId: folderId
      };
      
      // สร้าง Index จากเนื้อหา (คำตอบนักเรียนมักมีขนาดเล็กกว่าเฉลย จึงไม่จำเป็นต้องแบ่ง chunks)
      const document = createDocumentFromText(fileContent, metadata);
      
      // เก็บ document ไว้ใน cache
      const cacheKey = `student_answer_${studentAnswerId}`;
      setCache(cacheKey, document);
      
      // 2. สร้าง embeddings สำหรับ Milvus
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
      
      // อัพเดทสถานะทั้ง has_embeddings และ llamaindex_processed เป็น true
      await supabase
        .from('student_answers')
        .update({ 
          has_embeddings: true,
          llamaindex_processed: true,
          updated_at: new Date().toISOString()
        })
        .eq('student_answer_id', studentAnswerId);
      
      // อัพเดตข้อมูลที่จะส่งกลับ
      studentAnswerData[0].has_embeddings = true;
      studentAnswerData[0].llamaindex_processed = true;
    } catch (processingError) {
      console.error('Error processing with LlamaIndex and creating embeddings:', processingError);
      // บันทึกสถานะว่าการประมวลผลล้มเหลว แต่ไม่ส่งข้อผิดพลาดกลับไปหาผู้ใช้
      await supabase
        .from('student_answers')
        .update({ 
          processing_error: processingError.message,
          updated_at: new Date().toISOString()
        })
        .eq('student_answer_id', studentAnswerId);
      
      studentAnswerData[0].processing_error = processingError.message;
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
      .select('*, students(name), answer_keys(file_name, subjects(subject_name)), folders(folder_name)')
      .order('created_at', { ascending: false });
    
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
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ studentAnswers: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}