// File: app/api/embeddings/submission/route.js
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { processAndCreateEmbeddings } from '@/lib/embeddings';
import { insertSubmissionEmbeddings } from '@/lib/qdrant';
import { supabase } from '@/lib/supabase-admin';

// สร้าง embedding สำหรับงานนักเรียน
export async function POST(request) {
  try {
    const { submissionId, studentId, assignmentId, fileContent } = await request.json();
    
    // สร้าง embeddings
    const { textChunks, embeddings } = await processAndCreateEmbeddings(fileContent);
    
    // บันทึกลง Qdrant
    const result = await insertSubmissionEmbeddings(
      submissionId, 
      studentId, 
      assignmentId, 
      textChunks, 
      embeddings
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating submission embeddings:', error);
    return NextResponse.json(
      { status: 'error', message: error.message }, 
      { status: 500 }
    );
  }
}