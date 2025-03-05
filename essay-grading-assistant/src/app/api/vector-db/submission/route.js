// src/app/api/vectordb/submission/route.js
import { NextResponse } from 'next/server';
import { uploadSubmissionToVectorDB } from '@/lib/document-uploader';

export async function POST(request) {
  try {
    const { submissionId, assignmentId, studentId, fileContent } = await request.json();
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!submissionId || !assignmentId || !studentId || !fileContent) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'กรุณาระบุข้อมูลให้ครบถ้วน (submissionId, assignmentId, studentId, fileContent)' 
        }, 
        { status: 400 }
      );
    }

    console.log(`Processing submission: ${submissionId} from student: ${studentId}`);
    
    // อัปโหลดเข้า Vector Database
    const result = await uploadSubmissionToVectorDB({
      submissionId,
      assignmentId,
      studentId,
      fileContent: Buffer.from(fileContent, 'base64')  // แปลง base64 เป็น Buffer
    });
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `อัปโหลดงานนักเรียนสำเร็จ: ${result.chunks_count} chunks`,
      ...result
    });
  } catch (error) {
    console.error('Error uploading submission to vector database:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}