// File: app/api/grading/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-admin';
import { gradeSubmissionWithRAG } from '@/lib/rag';

export async function POST(request) {
  try {
    const { submissionId, assignmentId } = await request.json();
    
    // 1. ดึงข้อมูลการบ้านและคำถาม
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select('name, description')
      .eq('id', assignmentId)
      .single();
      
    if (assignmentError) throw assignmentError;
    
    // 2. ดึงข้อมูลเฉลย
    const { data: solution, error: solutionError } = await supabase
      .from('solutions')
      .select('file_path, file_name')
      .eq('assignment_id', assignmentId)
      .single();
      
    if (solutionError) throw solutionError;
    
    // 3. ดึงข้อมูลการส่งงานของนักเรียน
    const { data: submission, error: submissionError } = await supabase
      .from('student_submissions')
      .select('file_path, file_name, student_name, student_id')
      .eq('id', submissionId)
      .single();
      
    if (submissionError) throw submissionError;
    
    // 4. ดึงเนื้อหาไฟล์เฉลย
    const { data: solutionFile, error: solutionFileError } = await supabase.storage
      .from('teacher_solutions')
      .download(solution.file_path);
      
    if (solutionFileError) throw solutionFileError;
    
    // 5. ดึงเนื้อหาไฟล์คำตอบของนักเรียน
    const { data: submissionFile, error: submissionFileError } = await supabase.storage
      .from('student_submissions')
      .download(submission.file_path);
      
    if (submissionFileError) throw submissionFileError;
    
    // 6. แปลงไฟล์เป็นข้อความ
    const teacherSolutionContent = await solutionFile.text();
    const studentSubmissionContent = await submissionFile.text();
    
    // 7. ใช้ RAG ตรวจคำตอบ
    const gradingResults = await gradeSubmissionWithRAG(
      assignment.description,
      teacherSolutionContent,
      studentSubmissionContent
    );
    
    // 8. แยกคะแนนจากผลลัพธ์
    const scoreMatch = gradingResults.gradingResult.match(/สรุปคะแนนรวม: (\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : null;
    
    // 9. บันทึกผลคะแนนลงฐานข้อมูล
    if (score !== null) {
      const { data: grade, error: gradeError } = await supabase
        .from('grades')
        .upsert({
          submission_id: submissionId,
          teacher_id: submission.teacher_id,
          score: score,
          max_score: 100,
          feedback: gradingResults.gradingResult,
          llm_feedback: JSON.stringify(gradingResults),
          graded_at: new Date()
        })
        .select();
        
      if (gradeError) throw gradeError;
      
      // อัปเดตสถานะการตรวจงาน
      await supabase
        .from('student_submissions')
        .update({ is_graded: true })
        .eq('id', submissionId);
        
      return NextResponse.json({
        success: true,
        grade: grade[0],
        gradingResults
      });
    } else {
      throw new Error('ไม่สามารถระบุคะแนนได้');
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}