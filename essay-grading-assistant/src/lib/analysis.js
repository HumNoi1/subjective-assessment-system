// File: lib/analysis.js
import { createEmbeddings } from './embeddings';
import { generateResponse } from './llm';

// แยกประเด็นสำคัญจากเฉลย
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

// วิเคราะห์ความคล้ายคลึงเชิงความหมาย
export async function calculateSemanticSimilarity(text1, text2) {
  // สร้าง embeddings
  const [embedding1, embedding2] = await createEmbeddings([text1, text2]);
  
  // คำนวณ cosine similarity
  return cosineSimilarity(embedding1, embedding2);
}

// คำนวณ cosine similarity ระหว่างสองเวกเตอร์
function cosineSimilarity(vec1, vec2) {
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    mag1 += vec1[i] * vec1[i];
    mag2 += vec2[i] * vec2[i];
  }
  
  return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
}

// เปรียบเทียบคำตอบกับเฉลยแบบละเอียด
export async function compareSubmissionWithSolution(question, keyPoints, solutionContent, submissionContent) {
  const messages = [
    { role: 'system', content: 'คุณเป็นผู้ตรวจข้อสอบอัตนัยวิศวกรรมซอฟต์แวร์ที่มีความเชี่ยวชาญและละเอียดถี่ถ้วน' },
    {
      role: 'user',
      content: `วิเคราะห์คำตอบของนักเรียนโดยเปรียบเทียบกับเฉลยและประเด็นสำคัญ

โจทย์: ${question}

ประเด็นสำคัญที่ต้องมีในคำตอบ:
${keyPoints}

เฉลยของอาจารย์:
${solutionContent}

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

  return await generateResponse(messages, 0.3, 2048);
}