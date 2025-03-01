// src/app/api/llm/check-answer/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { checkAnswer } from '@/lib/llm';

export async function POST(request) {
  try {
    const startTime = Date.now();
    const { studentAnswer, answerKey, studentAnswerId, answerKeyId } = await request.json();
    
    if (!studentAnswer || !answerKey) {
      return NextResponse.json(
        { error: 'กรุณาระบุคำตอบนักเรียนและเฉลย' },
        { status: 400 }
      );
    }
    
    // ตรวจคำตอบโดย LLM
    const result = await checkAnswer(studentAnswer, answerKey);
    
    // คำนวณเวลาที่ใช้
    const processingTime = (Date.now() - startTime) / 1000;
    
    const supabase = await createServerClient();
    
    // บันทึกการใช้งาน LLM
    if (studentAnswerId && answerKeyId) {
      await supabase.from('llm_usage_logs').insert([
        {
          operation_type: 'check_answer',
          input_text: `Student Answer: ${studentAnswer.substring(0, 100)}... Answer Key: ${answerKey.substring(0, 100)}...`,
          output_text: result.substring(0, 500),
          processing_time: processingTime,
          token_count: result.split(' ').length
        }
      ]);
    }
    
    return NextResponse.json({ 
      result,
      processing_time: processingTime
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}