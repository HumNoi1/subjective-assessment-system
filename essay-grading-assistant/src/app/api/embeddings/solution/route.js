// File: src/app/api/embeddings/solution/route.js
import { NextResponse } from 'next/server';
import { processAndCreateEmbeddings } from '@/lib/embeddings';
import { 
  insertSolutionEmbeddings, 
  deleteSolutionEmbeddings 
} from '@/lib/qdrant';
import { 
  isPDF, 
  prepareContentForEmbedding 
} from '@/lib/pdf-extractor';

// สร้าง embedding สำหรับเฉลย
export async function POST(request) {
  try {
    const { solutionId, assignmentId, teacherId, fileContent } = await request.json();
    
    if (!fileContent) {
      return NextResponse.json(
        { status: 'error', message: 'No file content provided' }, 
        { status: 400 }
      );
    }
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!solutionId || !assignmentId || !teacherId) {
      return NextResponse.json(
        { status: 'error', message: 'Missing required parameters' }, 
        { status: 400 }
      );
    }

    // ล็อกข้อมูลการทำงาน
    console.log(`Processing solution: ${solutionId} for assignment: ${assignmentId}`);
    
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
      processedContent = "เฉลยอาจารย์ (ไม่สามารถแปลงเนื้อหาได้)";
    }
    
    // ประมวลผลและสร้าง embeddings
    const { textChunks, embeddings } = processAndCreateEmbeddings(processedContent);
    
    // บันทึกลง Qdrant
    const result = await insertSolutionEmbeddings(
      solutionId, 
      assignmentId, 
      teacherId, 
      textChunks, 
      embeddings
    );
    
    return NextResponse.json({
      ...result,
      isPdf: isPdfContent,
      chunksCount: textChunks.length,
      textSample: textChunks[0].substring(0, 100) // แสดงตัวอย่างข้อความ
    });
  } catch (error) {
    console.error('Error creating solution embeddings:', error);
    return NextResponse.json(
      { status: 'error', message: error.message }, 
      { status: 500 }
    );
  }
}