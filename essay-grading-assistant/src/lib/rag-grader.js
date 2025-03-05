// src/lib/rag-grader.js
import { retrieveRelevantSolutions, compareSubmissionWithSolution } from './document-retriever';
import axios from 'axios';

// กำหนดค่า API สำหรับ LLM
const LLM_ENDPOINT = process.env.LMSTUDIO_ENDPOINT || process.env.OPENAI_API_ENDPOINT || 'http://localhost:1234/v1/chat/completions';
const API_KEY = process.env.LMSTUDIO_API_KEY || process.env.OPENAI_API_KEY || 'lm-studio';
const MODEL_NAME = process.env.LLM_MODEL || 'llama-3-8b-instruct';

/**
 * สร้างคำตอบจาก LLM
 * @param {Array} messages - อาร์เรย์ของข้อความสนทนา
 * @param {number} temperature - ค่า temperature (0-1)
 * @param {number} maxTokens - จำนวน tokens สูงสุดในการตอบกลับ
 * @returns {Promise<string>} - ข้อความตอบกลับ
 */
async function generateResponse(messages, temperature = 0.7, maxTokens = 1024) {
  try {
    const response = await axios.post(
      LLM_ENDPOINT,
      {
        model: MODEL_NAME,
        messages,
        temperature,
        max_tokens: maxTokens,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating LLM response:', error);
    throw error;
  }
}

/**
 * ดึงประเด็นสำคัญจากเฉลย
 * @param {string} solutionContent - เนื้อหาเฉลย
 * @returns {Promise<string>} - ประเด็นสำคัญที่ดึงได้
 */
export async function extractKeyPoints(solutionContent) {
  const messages = [
    { role: 'system', content: 'คุณเป็นผู้เชี่ยวชาญด้านวิศวกรรมซอฟต์แวร์' },
    {
      role: 'user',
      content: `แยกประเด็นสำคัญที่จำเป็นต้องมีในคำตอบจากเฉลยต่อไปนี้ โดยแสดงเป็นข้อๆ พร้อมคำอธิบายและน้ำหนักคะแนนสำหรับแต่ละประเด็น (รวม 100 คะแนน):

${solutionContent}`
    }
  ];

  return await generateResponse(messages);
}

/**
 * ตรวจคำตอบของนักเรียนโดยใช้ RAG
 * @param {Object} params - พารามิเตอร์
 * @param {string} params.question - โจทย์คำถาม
 * @param {string} params.solutionContent - เนื้อหาเฉลย
 * @param {string} params.submissionContent - เนื้อหาคำตอบนักเรียน
 * @returns {Promise<Object>} - ผลการตรวจ
 */
export async function gradeSubmissionWithRAG({ question, assignmentId, submissionId, solutionContent, submissionContent }) {
  try {
    // 1. ดึงประเด็นสำคัญจากเฉลย
    const keyPoints = await extractKeyPoints(solutionContent);
    
    // 2. เปรียบเทียบคำตอบกับเฉลย
    let relevantSolutionParts = [];
    
    // ถ้ามี assignmentId และ submissionId ให้ใช้ Vector DB ในการเปรียบเทียบ
    if (assignmentId && submissionId) {
      const comparisonResult = await compareSubmissionWithSolution({
        assignmentId,
        submissionId,
        limit: 3
      });
      
      if (comparisonResult.success) {
        // รวบรวมส่วนของเฉลยที่เกี่ยวข้อง
        relevantSolutionParts = comparisonResult.comparisons
          .flatMap(comp => comp.relevant_solutions)
          .map(sol => sol.content)
          .slice(0, 5); // จำกัดจำนวนเพื่อไม่ให้ prompt ยาวเกินไป
      }
    }
    
    // 3. สร้าง Prompt สำหรับตรวจคำตอบ
    let relevantContext = "";
    if (relevantSolutionParts.length > 0) {
      relevantContext = `\nส่วนของเฉลยที่เกี่ยวข้องกับคำตอบของนักเรียน:
${relevantSolutionParts.join('\n---\n')}`;
    }
    
    const messages = [
      { role: 'system', content: 'คุณเป็นผู้ช่วยตรวจข้อสอบอัตนัยแนวคิดวิศวกรรมซอฟต์แวร์ที่มีความเชี่ยวชาญและละเอียดถี่ถ้วน' },
      {
        role: 'user',
        content: `วิเคราะห์คำตอบของนักเรียนโดยเปรียบเทียบกับเฉลยและประเด็นสำคัญ

โจทย์: ${question}

ประเด็นสำคัญที่ต้องมีในคำตอบ:
${keyPoints}

เฉลยของอาจารย์:
${solutionContent}${relevantContext}

คำตอบของนักเรียน:
${submissionContent}

กรุณาวิเคราะห์แต่ละประเด็นสำคัญว่านักเรียนตอบได้ครบถ้วนและถูกต้องหรือไม่ โดยให้:
1. สรุปแต่ละประเด็นว่าครบถ้วน (✓), บางส่วน (△), หรือขาดหาย (✗)
2. ระบุคะแนนที่ได้ในแต่ละประเด็น
3. อธิบายเหตุผลการให้คะแนนของแต่ละประเด็น
4. สรุปคะแนนรวมทั้งหมด (จาก 100 คะแนน)
5. ให้ข้อเสนอแนะเพื่อปรับปรุงคำตอบ`
      }
    ];
    
    // 4. ส่ง Prompt ไปยัง LLM
    const gradingResult = await generateResponse(messages, 0.3, 2048);
    
    // 5. แยกคะแนนจากผลลัพธ์
    const scoreMatch = gradingResult.match(/สรุปคะแนนรวมทั้งหมด[^\d]*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : null;
    
    return {
      success: true,
      gradingResult,
      keyPoints,
      score,
      has_rag_context: relevantSolutionParts.length > 0
    };
  } catch (error) {
    console.error('Error grading submission with RAG:', error);
    return {
      success: false,
      message: error.message
    };
  }
}