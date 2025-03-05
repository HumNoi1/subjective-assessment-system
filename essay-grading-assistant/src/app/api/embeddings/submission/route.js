// src/app/api/embeddings/submission/route.js
import { NextResponse } from 'next/server';
import { createMockEmbeddings } from '@/lib/utils/embeddings';
import { insertSubmissionEmbeddings } from '@/lib/utils/qdrant-client';
import { isPDF, prepareContentForEmbedding } from '@/lib/utils/pdf-loader';
import { splitTextIntoChunks } from '@/lib/utils/text-splitter';

// สร้าง embedding สำหรับงานนักเรียน
export async function POST(request) {
  try {
    const { submissionId, assignmentId, studentId, fileContent } = await request.json();
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!submissionId || !studentId || !assignmentId || !fileContent) {
      return NextResponse.json(
        { status: 'error', message: 'Missing required parameters' }, 
        { status: 400 }
      );
    }

    // ล็อกข้อมูลเพื่อการตรวจสอบ
    console.log(`Processing submission: ${submissionId} from student: ${studentId}`);
    
    // แปลง base64 เป็นข้อความหรือ Buffer ตามความเหมาะสม
    let decodedContent;
    try {
      decodedContent = Buffer.from(fileContent, 'base64');
    } catch (error) {
      decodedContent = fileContent; // หากไม่ใช่ base64 ให้ใช้ค่าเดิม
    }
    
    // เตรียมเนื้อหาสำหรับการทำ embedding
    let processedContent;
    let isPdfContent = isPDF(decodedContent);
    
    try {
      processedContent = await prepareContentForEmbedding(decodedContent);
    } catch (prepareError) {
      console.error('Error preparing content:', prepareError);
      processedContent = typeof decodedContent === 'string' ? decodedContent : 'ไม่สามารถเตรียมเนื้อหาได้';
    }
    
    // ตรวจสอบเนื้อหาหลังจากการเตรียม
    if (!processedContent || processedContent.length < 10) {
      console.warn('Content too short or invalid after preparation');
      processedContent = "คำตอบนักเรียน (ไม่สามารถแปลงเนื้อหาได้)";
    }
    
    // แบ่งข้อความเป็นชิ้นเล็กๆ
    const textChunks = await splitTextIntoChunks(processedContent);
    
    // สร้าง mock embeddings แทนการใช้ API จริง (สำหรับทดสอบ)
    const embeddings = createMockEmbeddings(textChunks.length);
    
    // บันทึกลง Qdrant
    const result = await insertSubmissionEmbeddings(
      submissionId,
      studentId,
      assignmentId,
      textChunks,
      embeddings
    );
    
    return NextResponse.json({
      ...result,
      isPdf: isPdfContent,
      chunksCount: textChunks.length,
      textSample: textChunks.length > 0 ? textChunks[0].substring(0, 100) : ''
    });
  } catch (error) {
    console.error('Error creating submission embeddings:', error);
    return NextResponse.json(
      { status: 'error', message: error.message }, 
      { status: 500 }
    );
  }
}