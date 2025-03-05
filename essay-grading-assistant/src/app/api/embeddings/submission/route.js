// File: src/app/api/embeddings/submission/route.js
import { NextResponse } from 'next/server';
import { 
  processAndCreateEmbeddings, 
  createMockEmbeddings 
} from '@/lib/embeddings';
import { insertSubmissionEmbeddings } from '@/lib/qdrant';
import { 
  isPDF, 
  prepareContentForEmbedding 
} from '@/lib/pdf-extractor';

// สร้าง embedding สำหรับงานนักเรียน
export async function POST(request) {
  try {
    const { submissionId, studentId, assignmentId, fileContent } = await request.json();
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!submissionId || !studentId || !assignmentId || !fileContent) {
      return NextResponse.json(
        { status: 'error', message: 'Missing required parameters' }, 
        { status: 400 }
      );
    }

    // ล็อกข้อมูลเพื่อการตรวจสอบ
    console.log(`Processing submission: ${submissionId} from student: ${studentId}`);
    
    // เตรียมเนื้อหาสำหรับการทำ embedding
    let processedContent;
    let isPdfContent = isPDF(fileContent);
    
    try {
      processedContent = await prepareContentForEmbedding(fileContent);
    } catch (prepareError) {
      console.error('Error preparing content:', prepareError);
      processedContent = fileContent; // ใช้เนื้อหาเดิมถ้ามีปัญหา
    }
    
    // ตรวจสอบเนื้อหาหลังจากการเตรียม
    if (!processedContent || processedContent.length < 10) {
      console.warn('Content too short or invalid after preparation');
      
      // สร้าง mock data ในกรณีที่เนื้อหาไม่ถูกต้อง
      const textChunks = ["คำตอบนักเรียน (ไม่สามารถแปลงเนื้อหาได้)"];
      const embeddings = createMockEmbeddings(1);
      
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
        chunksCount: 1,
        warning: 'Unable to process file content, using mock data'
      });
    }
    
    // ดำเนินการปกติถ้าเนื้อหาถูกต้อง
    let textChunks, embeddings;
    
    try {
      // สร้าง embedding จากเนื้อหา
      const result = await processAndCreateEmbeddings(processedContent);
      textChunks = result.textChunks;
      embeddings = result.embeddings;
    } catch (embeddingError) {
      console.error('Error creating embeddings:', embeddingError);
      
      // เตรียม mock data ในกรณีที่มีปัญหา
      textChunks = ["คำตอบนักเรียน (ไม่สามารถสร้าง embedding)"];
      embeddings = createMockEmbeddings(1);
    }
    
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
      textSample: textChunks[0].substring(0, 100) // แสดงตัวอย่างข้อความเพื่อตรวจสอบ
    });
  } catch (error) {
    console.error('Error creating submission embeddings:', error);
    return NextResponse.json(
      { status: 'error', message: error.message }, 
      { status: 500 }
    );
  }
}