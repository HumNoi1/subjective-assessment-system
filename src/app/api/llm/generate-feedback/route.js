// src/app/api/llm/generate-feedback/route.js
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
    const { studentAnswer, answerKey, score, comparisonResult, studentAnswerId, answerKeyId } = await request.json();
    
    if (!studentAnswer || !answerKey) {
      return NextResponse.json(
        { error: 'กรุณาระบุคำตอบนักเรียนและเฉลย' },
        { status: 400 }
      );
    }
    
    // สร้าง prompt สำหรับสร้างข้อเสนอแนะ
    const prompt = `
ฉันต้องการให้คุณสร้างข้อเสนอแนะที่เป็นประโยชน์สำหรับนักเรียนจากคำตอบของเขา โดยใช้ข้อมูลต่อไปนี้:

เฉลย:
${answerKey}

คำตอบนักเรียน:
${studentAnswer}

${comparisonResult ? `ผลการเปรียบเทียบ:
${comparisonResult}` : ''}

${score ? `คะแนนที่ได้: ${score}%` : ''}

โปรดให้ข้อเสนอแนะโดยระบุ:
1. จุดเด่นของคำตอบ (ชมเชยสิ่งที่ทำได้ดี)
2. จุดที่ควรปรับปรุง (ระบุประเด็นที่ขาดหายหรือไม่ถูกต้อง)
3. คำแนะนำเฉพาะจุดเพื่อพัฒนาคำตอบให้ดีขึ้น
4. แนวทางการศึกษาเพิ่มเติมในหัวข้อนี้
`;

    // เรียกใช้ LLM
    const response = await openai.chat.completions.create({
      model: "llama3.2-3b",
      messages: [
        { role: "system", content: "คุณเป็นครูที่มีประสบการณ์และเชี่ยวชาญในการให้ข้อเสนอแนะที่สร้างสรรค์" },
        { role: "user", content: prompt }
      ],
      temperature: 0.4,
    });
    
    const result = response.choices[0].message.content;
    
    // คำนวณเวลาที่ใช้
    const processingTime = (Date.now() - startTime) / 1000;
    
    const supabase = await createServerClient();
    
    // บันทึกการใช้งาน LLM
    if (studentAnswerId && answerKeyId) {
      await supabase.from('llm_usage_logs').insert([
        {
          operation_type: 'generate_feedback',
          input_text: prompt.substring(0, 500),
          output_text: result.substring(0, 500),
          processing_time: processingTime,
          token_count: result.split(' ').length
        }
      ]);
    }
    
    return NextResponse.json({ 
      feedback: result,
      processing_time: processingTime
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}