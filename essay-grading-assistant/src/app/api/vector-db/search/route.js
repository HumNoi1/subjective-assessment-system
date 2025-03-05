// src/app/api/vectordb/search/route.js
import { NextResponse } from 'next/server';
import { retrieveRelevantSolutions, retrieveRelevantSubmissions } from '@/lib/document-retriever';

export async function POST(request) {
  try {
    const { assignmentId, query, type = 'solution', limit = 5 } = await request.json();
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!assignmentId || !query) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'กรุณาระบุข้อมูลให้ครบถ้วน (assignmentId, query)' 
        }, 
        { status: 400 }
      );
    }

    // ค้นหาตามประเภทที่ระบุ
    let results;
    if (type === 'solution') {
      results = await retrieveRelevantSolutions({ assignmentId, query, limit });
    } else if (type === 'submission') {
      results = await retrieveRelevantSubmissions({ assignmentId, query, limit });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: 'ประเภทไม่ถูกต้อง (type ต้องเป็น "solution" หรือ "submission")' 
        }, 
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      results,
      count: results.length,
      query,
      type
    });
  } catch (error) {
    console.error('Error searching vector database:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}