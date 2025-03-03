// src/lib/llm.js
import OpenAI from 'openai';

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

// Create embeddings
export async function createEmbeddings(text) {
  try {
    // Ensure text is a string
    if (typeof text !== 'string') {
      console.warn('Input to createEmbeddings is not a string:', typeof text);
      text = String(text);
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

      return response.data[0].embedding;
    } catch (apiError) {
      console.error('LLM API error, using mock embedding:', apiError.message);
      return createMockEmbedding(text);
    }
  } catch (error) {
    console.error('Error creating embeddings:', error);
    return createMockEmbedding(text);
  }
}

// Check answer using LLM
export async function checkAnswer(studentAnswer, answerKey) {
  const prompt = `
ฉันกำลังตรวจข้อสอบอัตนัย โปรดเปรียบเทียบคำตอบของนักเรียนกับเฉลย

เกณฑ์การให้คะแนน:
1. ความถูกต้องของเนื้อหา (60%)
2. ความครบถ้วนของคำตอบ (30%) 
3. การใช้ภาษาและการเรียบเรียง (10%)

เฉลย:
${answerKey}

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
      model: "llama3", // ใช้โมเดลที่ LMStudio รองรับ
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