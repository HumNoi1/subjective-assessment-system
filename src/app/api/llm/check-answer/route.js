// src/app/api/llm/check-answer/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { checkAnswer } from '@/lib/llm';
import { queryAnswerKeyForAssessment } from '@/lib/llamaindex';

export async function POST(request) {
  try {
    const startTime = Date.now();
    const { studentAnswer, answerKey, studentAnswerId, answerKeyId, useLlamaIndex = true } = await request.json();
    
    if (!studentAnswer || !answerKey) {
      return NextResponse.json(
        { error: 'กรุณาระบุคำตอบนักเรียนและเฉลย' },
        { status: 400 }
      );
    }
    
    let result;
    let relevantContent = null;
    
    // ใช้ LlamaIndex เพื่อค้นหาส่วนที่เกี่ยวข้องก่อนส่งไปให้ LLM
    if (useLlamaIndex && answerKeyId) {
      try {
        const llamaIndexResult = await queryAnswerKeyForAssessment(studentAnswer, answerKeyId);
        relevantContent = llamaIndexResult.relevantContent;
        
        // ตรวจคำตอบด้วย LLM โดยใช้เนื้อหาที่เกี่ยวข้องจาก LlamaIndex
        result = await checkAnswer(studentAnswer, answerKey, relevantContent);
      } catch (llamaIndexError) {
        console.error('Error using LlamaIndex:', llamaIndexError);
        // ถ้าเกิดข้อผิดพลาด ให้ใช้วิธีเดิม
        result = await checkAnswer(studentAnswer, answerKey);
      }
    } else {
      // วิธีเดิมไม่ใช้ LlamaIndex
      result = await checkAnswer(studentAnswer, answerKey);
    }
    
    // คำนวณเวลาที่ใช้
    const processingTime = (Date.now() - startTime) / 1000;
    
    const supabase = await createServerClient();
    
    // บันทึกการใช้งาน LLM
    if (studentAnswerId && answerKeyId) {
      await supabase.from('llm_usage_logs').insert([
        {
          operation_type: 'check_answer',
          input_text: `Student Answer: ${studentAnswer.substring(0, 100)}... Answer Key: ${relevantContent ? 'Using LlamaIndex RAG' : 'Direct comparison'}`,
          output_text: result.substring(0, 500),
          processing_time: processingTime,
          token_count: result.split(' ').length
        }
      ]);
    }
    
    return NextResponse.json({ 
      result,
      processing_time: processingTime,
      used_llamaindex: relevantContent !== null
    });
    
  } catch (error) {
    console.error('Error checking answer:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการตรวจคำตอบ' },
      { status: 500 }
    );
  }
}