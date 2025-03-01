// src/app/api/llm/self-score/route.js
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
    const { comparisonResult, studentAnswerId, answerKeyId } = await request.json();
    
    if (!comparisonResult) {
      return NextResponse.json(
        { error: 'กรุณาระบุผลการเปรียบเทียบคำตอบ' },
        { status: 400 }
      );
    }
    
    // สร้าง prompt สำหรับให้คะแนน
    const prompt = `
จากผลการเปรียบเทียบคำตอบของนักเรียนกับเฉลยต่อไปนี้ โปรดให้คะแนนในรูปแบบเปอร์เซ็นต์ (0-100%) พร้อมคำอธิบายสั้นๆ:

เกณฑ์การให้คะแนน:
1. ความถูกต้องของเนื้อหา (60%)
2. ความครบถ้วนของคำตอบ (30%)
3. การใช้ภาษาและการเรียบเรียง (10%)

ผลการเปรียบเทียบ:
${comparisonResult}

โปรดแสดงคะแนนในรูปแบบ: "คะแนน: XX%" และตามด้วยคำอธิบายสั้นๆ
`;

    // เรียกใช้ LLM
    const response = await openai.chat.completions.create({
      model: "llama3.2-3b",
      messages: [
        { role: "system", content: "คุณเป็นผู้ช่วยตรวจข้อสอบอัตนัยที่เชี่ยวชาญในการให้คะแนน" },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
    });
    
    const result = response.choices[0].message.content;
    
    // แยกคะแนนจากผลลัพธ์
    const scoreMatch = result.match(/คะแนน:\s*(\d+)%/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : null;
    
    // คำนวณเวลาที่ใช้
    const processingTime = (Date.now() - startTime) / 1000;
    
    const supabase = await createServerClient();
    
    // บันทึกการใช้งาน LLM
    if (studentAnswerId && answerKeyId) {
      await supabase.from('llm_usage_logs').insert([
        {
          operation_type: 'self_score',
          input_text: prompt.substring(0, 500),
          output_text: result.substring(0, 500),
          processing_time: processingTime,
          token_count: result.split(' ').length
        }
      ]);
    }
    
    return NextResponse.json({ 
      result,
      score,
      processing_time: processingTime
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}