// src/app/api/llm/self-score/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { selfScore } from '@/lib/llm';
import { queryAnswerKeyForAssessment } from '@/lib/llamaindex';

export async function POST(request) {
  try {
    const startTime = Date.now();
    const { comparisonResult, studentAnswer, answerKey, studentAnswerId, answerKeyId, useLlamaIndex = true } = await request.json();
    
    if (!comparisonResult) {
      return NextResponse.json(
        { error: 'กรุณาระบุผลการเปรียบเทียบคำตอบ' },
        { status: 400 }
      );
    }
    
    let result;
    let score;
    let relevantContent = null;
    
    // ใช้ LlamaIndex เพื่อค้นหาส่วนที่เกี่ยวข้องก่อนส่งไปให้ LLM
    if (useLlamaIndex && studentAnswer && answerKey && answerKeyId) {
      try {
        const llamaIndexResult = await queryAnswerKeyForAssessment(studentAnswer, answerKeyId);
        relevantContent = llamaIndexResult.relevantContent;
        
        // ให้คะแนนด้วย LLM โดยใช้เนื้อหาที่เกี่ยวข้องจาก LlamaIndex
        const scoreResult = await selfScore(comparisonResult, studentAnswer, answerKey, relevantContent);
        result = scoreResult.result;
        score = scoreResult.score;
      } catch (llamaIndexError) {
        console.error('Error using LlamaIndex:', llamaIndexError);
        // ถ้าเกิดข้อผิดพลาด ให้ใช้วิธีเดิม
        const scoreResult = await selfScore(comparisonResult, studentAnswer, answerKey);
        result = scoreResult.result;
        score = scoreResult.score;
      }
    } else {
      // วิธีเดิมไม่ใช้ LlamaIndex
      const scoreResult = await selfScore(comparisonResult, studentAnswer, answerKey);
      result = scoreResult.result;
      score = scoreResult.score;
    }
    
    // คำนวณเวลาที่ใช้
    const processingTime = (Date.now() - startTime) / 1000;
    
    const supabase = await createServerClient();
    
    // บันทึกการใช้งาน LLM
    if (studentAnswerId && answerKeyId) {
      await supabase.from('llm_usage_logs').insert([
        {
          operation_type: 'self_score',
          input_text: `Comparison: ${comparisonResult.substring(0, 200)}... ${relevantContent ? 'Using LlamaIndex RAG' : 'Direct scoring'}`,
          output_text: result.substring(0, 500),
          processing_time: processingTime,
          token_count: result.split(' ').length
        }
      ]);
    }
    
    return NextResponse.json({ 
      result,
      score,
      processing_time: processingTime,
      used_llamaindex: relevantContent !== null
    });
    
  } catch (error) {
    console.error('Error scoring answer:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการให้คะแนน' },
      { status: 500 }
    );
  }
}