// File: app/api/grading/feedback/route.js
import { NextResponse } from 'next/server';
import { generateFeedback } from '@/lib/feedback';
import { supabase } from '@/lib/supabase-admin';

export async function POST(request) {
  try {
    const { gradeId } = await request.json();
    
    // ดึงข้อมูลคะแนนและการวิเคราะห์
    const { data: grade } = await supabase
      .from('grades')
      .select('submission_id, score, feedback, llm_feedback')
      .eq('id', gradeId)
      .single();
    
    // ดึงข้อมูลการส่งงานและโจทย์
    const { data: submission } = await supabase
      .from('student_submissions')
      .select('assignment_id, file_path')
      .eq('id', grade.submission_id)
      .single();
    
    const { data: assignment } = await supabase
      .from('assignments')
      .select('description')
      .eq('id', submission.assignment_id)
      .single();
    
    // ดึงข้อมูลเฉลย
    const { data: solution } = await supabase
      .from('solutions')
      .select('file_path')
      .eq('assignment_id', submission.assignment_id)
      .single();
    
    // ดึงเนื้อหาไฟล์
    const { data: solutionFile } = await supabase.storage
      .from('teacher_solutions')
      .download(solution.file_path);
    
    const { data: submissionFile } = await supabase.storage
      .from('student_submissions')
      .download(submission.file_path);
    
    const solutionContent = await solutionFile.text();
    const submissionContent = await submissionFile.text();
    
    // แยกข้อมูล llm_feedback
    const llmFeedback = JSON.parse(grade.llm_feedback);
    
    // สร้างข้อเสนอแนะเพิ่มเติม
    const detailedFeedback = await generateFeedback(
      assignment.description,
      llmFeedback.keyPoints,
      solutionContent,
      submissionContent,
      grade.feedback
    );
    
    // อัปเดตข้อเสนอแนะในฐานข้อมูล
    await supabase
      .from('grades')
      .update({
        feedback: detailedFeedback
      })
      .eq('id', gradeId);
    
    return NextResponse.json({
      success: true,
      feedback: detailedFeedback
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}