// lib/langchain/answerComparison.js
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { LLMChain } from 'langchain/chains';
import { createVectorStore } from './embeddings';

// สร้าง LLM instance
export const llm = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'gpt-3.5-turbo', // หรือใช้โมเดลอื่นตามความเหมาะสม
  temperature: 0,
});

// ค้นหาเนื้อหาเฉลยที่เกี่ยวข้องกับคำตอบของนักเรียน
export const findRelevantAnswerKey = async (studentAnswer, answerKeyTableName, answerKeyId) => {
  const vectorStore = await createVectorStore(answerKeyTableName);
  
  // ค้นหาเอกสารที่เกี่ยวข้องจาก Vector Store
  const relevantDocs = await vectorStore.similaritySearch(studentAnswer, 3, {
    answer_key_id: answerKeyId,
  });
  
  return relevantDocs;
};

// สร้าง prompt template สำหรับการตรวจคำตอบ
const gradeAnswerPrompt = PromptTemplate.fromTemplate(`
คุณเป็นผู้ช่วยตรวจข้อสอบอัตนัย โปรดประเมินคำตอบของนักเรียนโดยเปรียบเทียบกับเฉลย

เฉลย:
{answer_key}

คำตอบของนักเรียน:
{student_answer}

โปรดวิเคราะห์คำตอบของนักเรียนและให้คะแนนตามเกณฑ์ต่อไปนี้:
1. ความถูกต้องของเนื้อหา (0-10 คะแนน)
2. ความครบถ้วนของคำตอบ (0-5 คะแนน)
3. การอธิบายและการให้เหตุผล (0-5 คะแนน)

รูปแบบการตอบกลับ:
คะแนน: [คะแนนรวม]/20
ความถูกต้อง: [คะแนนความถูกต้อง]/10
ความครบถ้วน: [คะแนนความครบถ้วน]/5
การอธิบาย: [คะแนนการอธิบาย]/5
ความมั่นใจในการประเมิน: [0-100%]
ข้อเสนอแนะ: [คำแนะนำเพื่อปรับปรุงคำตอบ]
จุดเด่น: [จุดเด่นของคำตอบ]
จุดที่ควรปรับปรุง: [จุดที่ควรปรับปรุง]
`);

// สร้าง LLM chain สำหรับการตรวจคำตอบ
export const createGradingChain = () => {
  return new LLMChain({
    llm: llm,
    prompt: gradeAnswerPrompt,
  });
};

// ฟังก์ชันหลักสำหรับการประเมินคำตอบ
export const evaluateStudentAnswer = async (studentAnswer, answerKeyTableName, answerKeyId) => {
  // 1. ค้นหาเฉลยที่เกี่ยวข้อง
  const relevantAnswerKey = await findRelevantAnswerKey(studentAnswer, answerKeyTableName, answerKeyId);
  
  // 2. สร้างเนื้อหาเฉลยจาก chunks ที่พบ
  const answerKeyContent = relevantAnswerKey.map(doc => doc.pageContent).join('\n\n');
  
  // 3. สร้าง grading chain
  const gradingChain = createGradingChain();
  
  // 4. ประมวลผลและประเมินคำตอบ
  const result = await gradingChain.call({
    answer_key: answerKeyContent,
    student_answer: studentAnswer,
  });
  
  return result.text;
};