// src/app/api/llm/compare-answers/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import OpenAI from 'openai';

// ใช้ OpenAI API เพื่อเชื่อมต่อกับ LMStudio
const openai = new OpenAI({
  baseURL: process.env.LMSTUDIO_API_URL || 'http://localhost:1234/v1',
  apiKey: process.env.LMSTUDIO_API_KEY || 'lm-studio',
});

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
    
    // สร้าง prompt สำหรับเปรียบเทียบ
    const prompt = `
ฉันต้องการเปรียบเทียบคำตอบของนักเรียนกับเฉลยอย่างละเอียด โปรดแสดง:
1. ประเด็นที่ตรงกัน
2. ประเด็นที่แตกต่าง
3. ประเด็นที่ขาดหายไปในคำตอบนักเรียน
4. ประเด็นเพิ่มเติมที่นักเรียนกล่าวถึงแต่ไม่อยู่ในเฉลย

เฉลย:
${answerKey}

คำตอบนักเรียน:
${studentAnswer}
`;

    // เรียกใช้ LLM
    const response = await openai.chat.completions.create({
      model: "llama3.2-3b",
      messages: [
        { role: "system", content: "คุณเป็นผู้ช่วยตรวจข้อสอบอัตนัยที่เชี่ยวชาญในการเปรียบเทียบคำตอบ" },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
    });
    
    const result = response.choices[0].message.content;
    
    // คำนวณเวลาที่ใช้
    const processingTime = (Date.now() - startTime) / 1000;
    
    const supabase = await createServerClient();
    
    // บันทึกการใช้งาน LLM
    if (studentAnswerId && answerKeyId) {
      await supabase.from('llm_usage_logs').insert([
        {
          operation_type: 'compare_answers',
          input_text: prompt.substring(0, 500),
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