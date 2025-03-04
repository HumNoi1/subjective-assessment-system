// src/app/api/assessments/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { checkAnswer } from '@/lib/llm';
import { queryAnswerKeyForAssessment } from '@/lib/llamaindex';

// สร้างการประเมินใหม่
export async function POST(request) {
  try {
    const { studentAnswerId, answerKeyId, useLlamaIndex = true } = await request.json();
    
    if (!studentAnswerId || !answerKeyId) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    // ดึงข้อมูลคำตอบนักเรียนและเฉลย
    const { data: studentAnswerData, error: studentAnswerError } = await supabase
      .from('student_answers')
      .select('*')
      .eq('student_answer_id', studentAnswerId)
      .single();
    
    if (studentAnswerError) {
      return NextResponse.json(
        { error: studentAnswerError.message },
        { status: 400 }
      );
    }
    
    const { data: answerKeyData, error: answerKeyError } = await supabase
      .from('answer_keys')
      .select('*')
      .eq('answer_key_id', answerKeyId)
      .single();
    
    if (answerKeyError) {
      return NextResponse.json(
        { error: answerKeyError.message },
        { status: 400 }
      );
    }
    
    let relevantContent = null;
    let assessmentResult;
    
    // ใช้ LlamaIndex เพื่อค้นหาส่วนที่เกี่ยวข้องก่อนส่งไปให้ LLM
    if (useLlamaIndex) {
      try {
        const llamaIndexResult = await queryAnswerKeyForAssessment(
          studentAnswerData.content, 
          answerKeyId
        );
        
        relevantContent = llamaIndexResult.relevantContent;
        
        // ตรวจคำตอบโดย LLM ด้วยข้อมูลจาก LlamaIndex
        assessmentResult = await checkAnswer(
          studentAnswerData.content,
          answerKeyData.content,
          relevantContent
        );
      } catch (llamaIndexError) {
        console.error('Error using LlamaIndex:', llamaIndexError);
        // ถ้าเกิดข้อผิดพลาด ให้ใช้วิธีเดิม
        assessmentResult = await checkAnswer(
          studentAnswerData.content,
          answerKeyData.content
        );
      }
    } else {
      // วิธีเดิมไม่ใช้ LlamaIndex
      assessmentResult = await checkAnswer(
        studentAnswerData.content,
        answerKeyData.content
      );
    }
    
    // แยกคะแนนและข้อเสนอแนะจากผลลัพธ์
    const scoreMatch = assessmentResult.match(/(\d+)%/);
    const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0;
    
    // บันทึกผลการประเมิน
    const { data: assessmentData, error: assessmentError } = await supabase
      .from('assessments')
      .insert([
        {
          student_answer_id: studentAnswerId,
          answer_key_id: answerKeyId,
          score: score,
          feedback_text: assessmentResult,
          confidence: 70,
          is_approved: false,
          used_llamaindex: relevantContent !== null
        }
      ])
      .select();
    
    if (assessmentError) {
      return NextResponse.json(
        { error: assessmentError.message },
        { status: 400 }
      );
    }
    
    // บันทึกการใช้งาน LLM
    await supabase
      .from('llm_usage_logs')
      .insert([
        {
          operation_type: 'check_answer',
          input_text: `Student Answer: ${studentAnswerData.content.substring(0, 100)}... ${relevantContent ? 'Using LlamaIndex RAG' : 'Direct assessment'}`,
          output_text: assessmentResult.substring(0, 500),
          processing_time: 5.0,
          token_count: assessmentResult.split(' ').length,
          assessment_id: assessmentData[0].assessment_id
        }
      ]);
    
    return NextResponse.json({ 
      message: 'ประเมินคำตอบสำเร็จ',
      assessment: assessmentData[0],
      used_llamaindex: relevantContent !== null
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// ดึงรายการการประเมินทั้งหมด (ไม่มีการเปลี่ยนแปลงใหญ่)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const studentAnswerId = searchParams.get('studentAnswerId');
    const isApproved = searchParams.get('isApproved');
    
    const supabase = await createServerClient();
    
    let query = supabase
      .from('assessments')
      .select(`
        *,
        student_answers (
          *,
          students (
            student_id,
            name
          )
        ),
        answer_keys (
          *,
          subjects (subject_name)
        )
      `);
    
    if (studentAnswerId) {
      query = query.eq('student_answer_id', studentAnswerId);
    }
    
    if (studentId) {
      query = query.eq('student_answers.student_id', studentId);
    }
    
    if (isApproved !== null) {
      query = query.eq('is_approved', isApproved === 'true');
    }
    
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ assessments: data });
    
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}