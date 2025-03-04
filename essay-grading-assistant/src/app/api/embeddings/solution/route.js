// File: app/api/embeddings/solution/route.js
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { processAndCreateEmbeddings } from '@/lib/embeddings';
import { insertSolutionEmbeddings, deleteSolutionEmbeddings } from '@/lib/milvus';
import { supabase } from '@/lib/supabase-admin';

// สร้าง embedding สำหรับเฉลย
export async function POST(request) {
  try {
    const { solutionId, assignmentId, teacherId, fileContent } = await request.json();
    
    // ลบ embeddings เก่าของเฉลยนี้ (ถ้ามี)
    await deleteSolutionEmbeddings(solutionId);
    
    // สร้าง embeddings ใหม่
    const { textChunks, embeddings } = await processAndCreateEmbeddings(fileContent);
    
    // บันทึกลง Milvus
    const result = await insertSolutionEmbeddings(
      solutionId, 
      assignmentId, 
      teacherId, 
      textChunks, 
      embeddings
    );
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: error.message }, 
      { status: 500 }
    );
  }
}