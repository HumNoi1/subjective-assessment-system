// src/app/api/llamaindex/relevant-content/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { queryAnswerKeyForAssessment } from '@/lib/llamaindex';

export async function POST(request) {
  try {
    const { studentAnswer, answerKeyId } = await request.json();
    
    if (!studentAnswer || !answerKeyId) {
      return NextResponse.json(
        { error: 'กรุณาระบุคำตอบนักเรียนและ ID ของไฟล์เฉลย' },
        { status: 400 }
      );
    }
    
    const startTime = Date.now();
    
    // ค้นหาเนื้อหาที่เกี่ยวข้องจากไฟล์เฉลย
    const result = await queryAnswerKeyForAssessment(studentAnswer, answerKeyId);
    
    // คำนวณเวลาที่ใช้
    const processingTime = (Date.now() - startTime) / 1000;
    
    // บันทึกการใช้งาน LLM (ถ้าต้องการ)
    const supabase = await createServerClient();
    await supabase.from('llm_usage_logs').insert([
      {
        operation_type: 'llamaindex_relevant_content',
        input_text: `Student Answer: ${studentAnswer.substring(0, 100)}... (answerKeyId: ${answerKeyId})`,
        output_text: result.relevantContent.substring(0, 500),
        processing_time: processingTime,
        token_count: result.relevantContent.split(' ').length
      }
    ]);
    
    return NextResponse.json({
      relevantContent: result.relevantContent,
      sourceNodes: result.sourceNodes,
      fullAnswerKey: result.fullAnswerKey,
      processing_time: processingTime
    });
    
  } catch (error) {
    console.error('Error getting relevant content with LlamaIndex:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการค้นหาเนื้อหาที่เกี่ยวข้อง' },
      { status: 500 }
    );
  }
}