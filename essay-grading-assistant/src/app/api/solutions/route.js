// File: app/api/embeddings/solution/route.js
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { processAndCreateEmbeddings } from '@/lib/mock-embeddings';
import { insertSolutionEmbeddings, deleteSolutionEmbeddings } from '@/lib/qdrant';
import { supabase } from '@/lib/supabase-admin';
import { isPDF, prepareContentForEmbedding } from '@/lib/pdf-extractor';

// สร้าง embedding สำหรับเฉลย
export async function POST(request) {
  try {
    const { solutionId, assignmentId, teacherId, fileContent } = await request.json();
    
    // ลบ embeddings เก่าของเฉลยนี้ (ถ้ามี)
    await deleteSolutionEmbeddings(solutionId);
    
    // เตรียมเนื้อหาสำหรับการทำ embedding (ตรวจสอบและแปลง PDF ถ้าจำเป็น)
    const processedContent = await prepareContentForEmbedding(fileContent);
    
    // ถ้าเป็น PDF แต่ไม่สามารถดึงข้อความได้ ให้ใช้ mock data
    const mockData = {
      textChunks: ["เฉลยอาจารย์"],
      embeddings: [new Array(1536).fill(0.1)]
    };
    
    // ถ้าไม่มีเนื้อหาที่เหมาะสม ให้ใช้ mock data
    const { textChunks, embeddings } = isPDF(fileContent) ? 
      mockData : 
      await processAndCreateEmbeddings(processedContent);
    
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
      isPdf: isPDF(fileContent),
      chunksCount: textChunks.length
    });
  } catch (error) {
    console.error('Error creating solution embeddings:', error);
    return NextResponse.json(
      { status: 'error', message: error.message }, 
      { status: 500 }
    );
  }
}