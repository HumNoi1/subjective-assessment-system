// File: lib/rag.js
import { processAndCreateEmbeddings, createEmbeddings } from './embeddings';
import { searchSimilarSubmissions } from './milvus';
import { generateResponse } from './llm';
import { PROMPTS } from './prompts';

// ฟังก์ชันดึงเนื้อหาไฟล์จาก Storage
async function fetchFileContent(bucket, filePath) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath);
      
    if (error) throw error;
    
    const content = await data.text();
    return content;
  } catch (error) {
    console.error('Error fetching file content:', error);
    throw error;
  }
}

// ฟังก์ชันดึงคำตอบที่คล้ายกันที่สุดจาก Milvus
async function retrieveSimilarSubmissions(assignmentId, queryText) {
  try {
    // สร้าง embedding สำหรับคำถาม
    const embeddings = await createEmbeddings([queryText]);
    const queryEmbedding = embeddings[0];
    
    // ค้นหาคำตอบที่คล้ายกัน
    const results = await searchSimilarSubmissions(assignmentId, queryEmbedding, 3);
    
    return results;
  } catch (error) {
    console.error('Error retrieving similar submissions:', error);
    throw error;
  }
}

// ฟังก์ชันตรวจคำตอบของนักเรียนโดยใช้ RAG
export async function gradeSubmissionWithRAG(question, teacherSolutionContent, studentSubmissionContent) {
  try {
    // 1. ดึงประเด็นสำคัญจากเฉลย
    const keyPointsMessages = createKeyPointsPrompt(teacherSolutionContent);
    const keyPoints = await generateResponse(keyPointsMessages);
    
    // 2. สร้าง Prompt สำหรับตรวจคำตอบ พร้อมแทรกประเด็นสำคัญ
    const gradingPrompt = [
      { role: 'system', content: 'คุณเป็นผู้ช่วยตรวจข้อสอบอัตนัยแนวคิดวิศวกรรมซอฟต์แวร์ที่มีความเชี่ยวชาญ' },
      {
        role: 'user',
        content: `คุณคือระบบผู้ช่วยตรวจข้อสอบอัตนัยแนวคิดวิศวกรรมซอฟต์แวร์ กรุณาตรวจคำตอบของนักเรียนตามเกณฑ์ต่อไปนี้:

โจทย์: ${question}

ประเด็นสำคัญที่ต้องมีในคำตอบ:
${keyPoints}

เฉลยของอาจารย์:
${teacherSolutionContent}

คำตอบของนักเรียน:
${studentSubmissionContent}

กรุณาวิเคราะห์คำตอบโดยละเอียดในรูปแบบต่อไปนี้:
1. สรุปคะแนนรวม: [0-100]
2. การวิเคราะห์ความถูกต้อง: ประเด็นที่ตรงกับเฉลย ประเด็นที่ขาดหายไป หรือประเด็นที่ไม่ถูกต้อง
3. ข้อเสนอแนะ: คำแนะนำเพื่อปรับปรุงคำตอบ

ตอบเป็นภาษาไทย โดยให้เนื้อหามีความกระชับและตรงประเด็น`
      }
    ];
    
    // 3. ส่ง Prompt ไปยัง LMStudio เพื่อรับผลการตรวจ
    const gradingResult = await generateResponse(gradingPrompt, 0.3, 2048);
    
    return {
      gradingResult,
      keyPoints
    };
  } catch (error) {
    console.error('Error grading submission with RAG:', error);
    throw error;
  }
}