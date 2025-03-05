// src/app/api/vectordb/solution/route.js
import { NextResponse } from 'next/server';
import { uploadSolutionToVectorDB } from '@/lib/document-uploader';

export async function POST(request) {
  try {
    const { solutionId, assignmentId, teacherId, fileContent } = await request.json();
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!solutionId || !assignmentId || !teacherId || !fileContent) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'กรุณาระบุข้อมูลให้ครบถ้วน (solutionId, assignmentId, teacherId, fileContent)' 
        }, 
        { status: 400 }
      );
    }

    console.log(`Processing solution: ${solutionId} for assignment: ${assignmentId}`);
    
    // อัปโหลดเข้า Vector Database
    const result = await uploadSolutionToVectorDB({
      solutionId,
      assignmentId,
      teacherId,
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
      message: `อัปโหลดเฉลยสำเร็จ: ${result.chunks_count} chunks`,
      ...result
    });
  } catch (error) {
    console.error('Error uploading solution to vector database:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}