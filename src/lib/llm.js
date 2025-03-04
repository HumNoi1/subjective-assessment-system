// src/lib/llm.js
import OpenAI from 'openai';
import { getCache, setCache } from './cache';

// Initialize the OpenAI client with fallback options
const openai = new OpenAI({
  baseURL: process.env.LMSTUDIO_API_URL || 'http://localhost:1234/v1',
  apiKey: process.env.LMSTUDIO_API_KEY || 'lm-studio', // default for LMStudio
  timeout: 60000, // 60 seconds
});

// สร้าง mock embedding เมื่อไม่สามารถเชื่อมต่อกับ LMStudio ได้
function createMockEmbedding(text) {
  // สร้าง embedding จำลองด้วยค่าสุ่ม
  console.warn('Creating mock embedding - LLM service unavailable');
  const embedding = new Array(1536).fill(0).map(() => Math.random());
  // ทำให้เป็น unit vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / magnitude);
}

// Create embeddings with caching
export async function createEmbeddings(text) {
  try {
    // Ensure text is a string
    if (typeof text !== 'string') {
      console.warn('Input to createEmbeddings is not a string:', typeof text);
      text = String(text);
    }

    // Use a hash of the text as a cache key
    const cacheKey = `embedding_${hashString(text.substring(0, 100))}`;
    const cachedEmbedding = getCache(cacheKey);
    
    if (cachedEmbedding) {
      return cachedEmbedding;
    }

    try {
      // Call the embeddings API
      const response = await openai.embeddings.create({
        model: "text-embedding-bge-m3@q4_k_m", // หรือโมเดลอื่นที่ LMStudio รองรับ
        input: text,
      });

      // Check if response is valid
      if (!response || !response.data || !response.data[0]) {
        throw new Error('Invalid embedding response from API');
      }
      
      const embedding = response.data[0].embedding;
      
      // Cache the result
      setCache(cacheKey, embedding);
      
      return embedding;
    } catch (apiError) {
      console.error('LLM API error, using mock embedding:', apiError.message);
      return createMockEmbedding(text);
    }
  } catch (error) {
    console.error('Error creating embeddings:', error);
    return createMockEmbedding(text);
  }
}

// Check answer using LLM with LlamaIndex content
export async function checkAnswer(studentAnswer, answerKey, relevantContent = null) {
  // If we have relevant content from LlamaIndex, use it for more focused assessment
  const contextToUse = relevantContent ? 
    `เฉลย (ส่วนที่เกี่ยวข้อง):\n${relevantContent}\n\nเฉลยฉบับเต็ม:\n${answerKey}` : 
    `เฉลย:\n${answerKey}`;

  const prompt = `
ฉันกำลังตรวจข้อสอบอัตนัย โปรดเปรียบเทียบคำตอบของนักเรียนกับเฉลย

เกณฑ์การให้คะแนน:
1. ความถูกต้องของเนื้อหา (60%)
2. ความครบถ้วนของคำตอบ (30%) 
3. การใช้ภาษาและการเรียบเรียง (10%)

${contextToUse}

คำตอบของนักเรียน:
${studentAnswer}

โปรดวิเคราะห์คำตอบโดยละเอียด และให้:
1. คะแนนเป็นเปอร์เซ็นต์ (0-100%)
2. จุดเด่นของคำตอบ
3. จุดที่ต้องปรับปรุง
4. ข้อเสนอแนะเพื่อการพัฒนา
`;

  try {
    const response = await openai.chat.completions.create({
      model: "bartowski/llama-3.2-3b-instruct", // ใช้โมเดลที่ LMStudio รองรับ
      messages: [
        { role: "system", content: "คุณเป็นผู้ช่วยตรวจข้อสอบอัตนัยที่มีความเชี่ยวชาญ มีความเที่ยงตรงและยุติธรรมในการประเมิน" },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error checking answer:', error);
    return `เกิดข้อผิดพลาดในการตรวจคำตอบ: ${error.message}\n\nคะแนน: 0%\n\nโปรดลองใหม่อีกครั้ง หรือตรวจสอบการเชื่อมต่อกับ LLM`;
  }
}

// Generate feedback with LlamaIndex content
export async function generateFeedback(studentAnswer, answerKey, score, relevantContent = null) {
  // If we have relevant content from LlamaIndex, use it for more focused feedback
  const contextToUse = relevantContent ? 
    `เฉลย (ส่วนที่เกี่ยวข้อง):\n${relevantContent}\n\nเฉลยฉบับเต็ม:\n${answerKey}` : 
    `เฉลย:\n${answerKey}`;

  const prompt = `
ฉันต้องการให้คุณสร้างข้อเสนอแนะที่เป็นประโยชน์สำหรับนักเรียนจากคำตอบของเขา โดยใช้ข้อมูลต่อไปนี้:

${contextToUse}

คำตอบนักเรียน:
${studentAnswer}

คะแนนที่ได้: ${score}%

โปรดให้ข้อเสนอแนะโดยระบุ:
1. จุดเด่นของคำตอบ (ชมเชยสิ่งที่ทำได้ดี)
2. จุดที่ควรปรับปรุง (ระบุประเด็นที่ขาดหายหรือไม่ถูกต้อง)
3. คำแนะนำเฉพาะจุดเพื่อพัฒนาคำตอบให้ดีขึ้น
4. แนวทางการศึกษาเพิ่มเติมในหัวข้อนี้
`;

  try {
    const response = await openai.chat.completions.create({
      model: "bartowski/llama-3.2-3b-instruct", // ใช้โมเดลที่ LMStudio รองรับ
      messages: [
        { role: "system", content: "คุณเป็นครูที่มีประสบการณ์และเชี่ยวชาญในการให้ข้อเสนอแนะที่สร้างสรรค์" },
        { role: "user", content: prompt }
      ],
      temperature: 0.4,
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating feedback:', error);
    return `เกิดข้อผิดพลาดในการสร้างข้อเสนอแนะ: ${error.message}\n\nโปรดลองใหม่อีกครั้ง`;
  }
}

// Compare answers with LlamaIndex content
export async function compareAnswers(studentAnswer, answerKey, relevantContent = null) {
  // If we have relevant content from LlamaIndex, use it for more focused comparison
  const contextToUse = relevantContent ? 
    `เฉลย (ส่วนที่เกี่ยวข้อง):\n${relevantContent}\n\nเฉลยฉบับเต็ม:\n${answerKey}` : 
    `เฉลย:\n${answerKey}`;

  const prompt = `
ฉันต้องการเปรียบเทียบคำตอบของนักเรียนกับเฉลยอย่างละเอียด โปรดแสดง:
1. ประเด็นที่ตรงกัน
2. ประเด็นที่แตกต่าง
3. ประเด็นที่ขาดหายไปในคำตอบนักเรียน
4. ประเด็นเพิ่มเติมที่นักเรียนกล่าวถึงแต่ไม่อยู่ในเฉลย

${contextToUse}

คำตอบนักเรียน:
${studentAnswer}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "bartowski/llama-3.2-3b-instruct", // ใช้โมเดลที่ LMStudio รองรับ
      messages: [
        { role: "system", content: "คุณเป็นผู้ช่วยตรวจข้อสอบอัตนัยที่เชี่ยวชาญในการเปรียบเทียบคำตอบ" },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error comparing answers:', error);
    return `เกิดข้อผิดพลาดในการเปรียบเทียบคำตอบ: ${error.message}\n\nโปรดลองใหม่อีกครั้ง`;
  }
}

// Self-score with LlamaIndex content
export async function selfScore(comparisonResult, studentAnswer, answerKey, relevantContent = null) {
  // If we have relevant content from LlamaIndex, use it for more accurate scoring
  const contextToUse = relevantContent ? 
    `เฉลย (ส่วนที่เกี่ยวข้อง):\n${relevantContent}\n\nเฉลยฉบับเต็ม:\n${answerKey}` : 
    `เฉลย:\n${answerKey}`;

  const prompt = `
จากผลการเปรียบเทียบคำตอบของนักเรียนกับเฉลยต่อไปนี้ โปรดให้คะแนนในรูปแบบเปอร์เซ็นต์ (0-100%) พร้อมคำอธิบายสั้นๆ:

เกณฑ์การให้คะแนน:
1. ความถูกต้องของเนื้อหา (60%)
2. ความครบถ้วนของคำตอบ (30%)
3. การใช้ภาษาและการเรียบเรียง (10%)

${contextToUse}

คำตอบนักเรียน:
${studentAnswer}

ผลการเปรียบเทียบ:
${comparisonResult}

โปรดแสดงคะแนนในรูปแบบ: "คะแนน: XX%" และตามด้วยคำอธิบายสั้นๆ
`;

  try {
    const response = await openai.chat.completions.create({
      model: "bartowski/llama-3.2-3b-instruct", // ใช้โมเดลที่ LMStudio รองรับ
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
    
    return {
      result,
      score
    };
  } catch (error) {
    console.error('Error scoring answer:', error);
    return {
      result: `เกิดข้อผิดพลาดในการให้คะแนน: ${error.message}\n\nโปรดลองใหม่อีกครั้ง`,
      score: 0
    };
  }
}

// Utility function to hash a string (for cache keys)
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

// Export OpenAI instance for LlamaIndex to use
export const llm = openai;