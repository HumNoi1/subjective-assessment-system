// src/app/api/llm/generate-feedback/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateFeedback } from '@/lib/llm';
import { queryAnswerKeyForAssessment } from '@/lib/llamaindex';

export async function POST(request) {
  try {
    const startTime = Date.now();
    const { studentAnswer, answerKey, score, comparisonResult, studentAnswerId, answerKeyId, useLlamaIndex = true } = await request.json();
    
    if (!studentAnswer || !answerKey) {
      return NextResponse.json(
        { error: 'กรุณาระบุคำตอบนักเรียนและเฉลย' },
        { status: 400 }
      );
    }
    
    let feedback;
    let relevantContent = null;
    
    // ใช้ LlamaIndex เพื่อค้นหาส่วนที่เกี่ยวข้องก่อนส่งไปให้ LLM
    if (useLlamaIndex && answerKeyId) {
      try {
        const llamaIndexResult = await queryAnswerKeyForAssessment(studentAnswer, answerKeyId);
        relevantContent = llamaIndexResult.relevantContent;
        
        // สร้างข้อเสนอแนะด้วย LLM โดยใช้เนื้อหาที่เกี่ยวข้องจาก LlamaIndex
        feedback = await generateFeedback(studentAnswer, answerKey, score, relevantContent);
      } catch (llamaIndexError) {
        console.error('Error using LlamaIndex:', llamaIndexError);
        // ถ้าเกิดข้อผิดพลาด ให้ใช้วิธีเดิม
        feedback = await generateFeedback(studentAnswer, answerKey, score);
      }
    } else {
      // วิธีเดิมไม่ใช้ LlamaIndex
      feedback = await generateFeedback(studentAnswer, answerKey, score);
    }
    
    // คำนวณเวลาที่ใช้
    const processingTime = (Date.now() - startTime) / 1000;
    
    const supabase = await createServerClient();
    
    // บันทึกการใช้งาน LLM
    if (studentAnswerId && answerKeyId) {
      await supabase.from('llm_usage_logs').insert([
        {
          operation_type: 'generate_feedback',
          input_text: `Student Answer: ${studentAnswer.substring(0, 100)}... Score: ${score}% ${relevantContent ? 'Using LlamaIndex RAG' : 'Direct feedback'}`,
          output_text: feedback.substring(0, 500),
          processing_time: processingTime,
          token_count: feedback.split(' ').length
        }
      ]);
    }
    
    return NextResponse.json({ 
      feedback,
      processing_time: processingTime,
      used_llamaindex: relevantContent !== null
    });
    
  } catch (error) {
    console.error('Error generating feedback:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการสร้างข้อเสนอแนะ' },
      { status: 500 }
    );
  }
}