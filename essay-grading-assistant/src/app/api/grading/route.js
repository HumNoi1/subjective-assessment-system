// src/app/api/grading/route.js
import { NextResponse } from 'next/server';
import { gradeSubmissionWithRAG } from '@/lib/rag-grader';

export async function POST(request) {
  try {
    const { question, assignmentId, submissionId, solutionContent, submissionContent } = await request.json();
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!question || !solutionContent || !submissionContent) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'กรุณาระบุข้อมูลให้ครบถ้วน (question, solutionContent, submissionContent)' 
        }, 
        { status: 400 }
      );
    }

    console.log(`Grading submission for question: ${question.substring(0, 50)}...`);
    
    // ตรวจคำตอบโดยใช้ RAG
    const result = await gradeSubmissionWithRAG({
      question,
      assignmentId,
      submissionId,
      solutionContent,
      submissionContent
    });
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message }, 
        { status: 500 }
      );
    }
    
    // อัปเดตตาราง grades (ไม่ได้ทำในโค้ดนี้ ให้ทำในฝั่ง client)
    
    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error grading submission:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}