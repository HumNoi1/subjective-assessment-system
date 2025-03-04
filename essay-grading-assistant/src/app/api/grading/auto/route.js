// File: app/api/grading/auto/route.js
import { NextResponse } from 'next/server';
import { autoGradeSubmission } from '@/lib/grading';

export async function POST(request) {
  try {
    const { submissionId, assignmentId } = await request.json();
    
    // เรียกใช้ฟังก์ชันตรวจข้อสอบอัตโนมัติ
    const result = await autoGradeSubmission(assignmentId, submissionId);
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}