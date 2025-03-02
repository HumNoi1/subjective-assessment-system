import OpenAI from 'openai';

// Initialize the OpenAI client
const openai = new OpenAI({
  baseURL: process.env.LMSTUDIO_API_URL || 'http://localhost:1234/v1',
  apiKey: process.env.LMSTUDIO_API_KEY || 'lm-studio', // default for LMStudio
  timeout: 60000, // 60 seconds
});

// Create embeddings
export async function createEmbeddings(text) {
  try {
    // Ensure text is a string
    if (typeof text !== 'string') {
      console.warn('Input to createEmbeddings is not a string:', typeof text);
      text = String(text);
    }

    // Call the embeddings API
    const response = await openai.embeddings.create({
      model: "text-embedding-bge-m3@q4_k_m", // Use a model available in LMStudio
      input: text,
    });

    // Check if response is valid
    if (!response || !response.data || !response.data[0]) {
      throw new Error('Invalid embedding response from API');
    }

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error creating embeddings:', error);
    throw new Error('Failed to create embeddings. Please check your LLM service connection.');
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
      model: "llama-3.2-3b-instruct", // Using a model supported by LMStudio
      messages: [
        { role: "system", content: "คุณเป็นผู้ช่วยตรวจข้อสอบอัตนัยที่มีความเชี่ยวชาญ มีความเที่ยงตรงและยุติธรรมในการประเมิน" },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error checking answer:', error);
    throw new Error('Failed to check answer. Please check your LLM service connection.');
  }
}