// src/app/api/llamaindex/query/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { queryAnswerKey } from '@/lib/llamaindex';

export async function POST(request) {
  try {
    const { query, answerKeyId, numResults = 3 } = await request.json();
    
    if (!query || !answerKeyId) {
      return NextResponse.json(
        { error: 'กรุณาระบุคำถามและ ID ของไฟล์เฉลย' },
        { status: 400 }
      );
    }
    
    const startTime = Date.now();
    
    // ค้นหาเนื้อหาที่เกี่ยวข้องจากไฟล์เฉลย
    const result = await queryAnswerKey(answerKeyId, query, numResults);
    
    // คำนวณเวลาที่ใช้
    const processingTime = (Date.now() - startTime) / 1000;
    
    // บันทึกการใช้งาน LLM (ถ้าต้องการ)
    const supabase = await createServerClient();
    await supabase.from('llm_usage_logs').insert([
      {
        operation_type: 'llamaindex_query',
        input_text: `Query: ${query} (answerKeyId: ${answerKeyId})`,
        output_text: result.response.substring(0, 500),
        processing_time: processingTime,
        token_count: result.response.split(' ').length
      }
    ]);
    
    return NextResponse.json({
      result: result.response,
      sourceNodes: result.sourceNodes,
      processing_time: processingTime
    });
    
  } catch (error) {
    console.error('Error querying with LlamaIndex:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการค้นหาข้อมูล' },
      { status: 500 }
    );
  }
}