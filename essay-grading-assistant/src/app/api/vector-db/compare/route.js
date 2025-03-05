// src/app/api/vectordb/compare/route.js
import { NextResponse } from 'next/server';
import { compareSubmissionWithSolution } from '@/lib/document-retriever';

export async function POST(request) {
  try {
    const { assignmentId, submissionId, limit = 3 } = await request.json();
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!assignmentId || !submissionId) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'กรุณาระบุข้อมูลให้ครบถ้วน (assignmentId, submissionId)' 
        }, 
        { status: 400 }
      );
    }

    console.log(`Comparing submission ${submissionId} with solutions for assignment ${assignmentId}`);
    
    // เปรียบเทียบงานนักเรียนกับเฉลย
    const result = await compareSubmissionWithSolution({
      assignmentId,
      submissionId,
      limit
    });
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error comparing submission with solution:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}