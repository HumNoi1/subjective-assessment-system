// File: app/api/embeddings/search/route.js
import { NextResponse } from 'next/server';
import { createEmbeddings } from '@/lib/embeddings';
import { searchSimilarSubmissions } from '@/lib/utils/qdrant-client';

// ค้นหาคำตอบของนักเรียนที่คล้ายกับเฉลย
export async function POST(request) {
  try {
    const { assignmentId, queryText, limit = 5 } = await request.json();
    
    // สร้าง embedding สำหรับคำถามที่ต้องการค้นหา
    const embeddings = await createEmbeddings([queryText]);
    const queryEmbedding = embeddings[0];
    
    // ค้นหาคำตอบที่คล้ายกัน
    const results = await searchSimilarSubmissions(
      assignmentId, 
      queryEmbedding, 
      limit
    );
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error searching embeddings:', error);
    return NextResponse.json(
      { status: 'error', message: error.message }, 
      { status: 500 }
    );
  }
}