// src/lib/document-retriever.js
import { createQueryEmbedding } from './utils/embeddings';
import { COLLECTIONS, searchSimilarVectors } from './utils/qdrant-client';

/**
 * ค้นหาเฉลยอาจารย์ที่เกี่ยวข้องกับคำถาม
 * @param {Object} params - พารามิเตอร์
 * @param {string} params.assignmentId - ID ของงาน
 * @param {string} params.query - คำถามหรือข้อความที่ต้องการค้นหา
 * @param {number} params.limit - จำนวนผลลัพธ์สูงสุด
 * @returns {Promise<Array>} - ผลลัพธ์การค้นหา
 */
export async function retrieveRelevantSolutions({ assignmentId, query, limit = 5 }) {
  try {
    // 1. สร้าง embedding จากคำถาม
    const queryEmbedding = await createQueryEmbedding(query);
    
    // 2. ค้นหาเฉลยที่เกี่ยวข้อง
    const results = await searchSimilarVectors(
      COLLECTIONS.SOLUTIONS,
      queryEmbedding,
      {
        must: [
          {
            key: 'assignment_id',
            match: { value: assignmentId }
          }
        ]
      },
      limit
    );
    
    // 3. จัดรูปแบบผลลัพธ์
    return results.map(result => ({
      id: result.id,
      content: result.payload.content,
      score: result.score,
      solution_id: result.payload.solution_id,
      chunk_index: result.payload.chunk_index
    }));
  } catch (error) {
    console.error('Error retrieving relevant solutions:', error);
    return [];
  }
}

/**
 * ค้นหางานนักเรียนที่เกี่ยวข้องกับคำถาม
 * @param {Object} params - พารามิเตอร์
 * @param {string} params.assignmentId - ID ของงาน
 * @param {string} params.query - คำถามหรือข้อความที่ต้องการค้นหา
 * @param {number} params.limit - จำนวนผลลัพธ์สูงสุด
 * @returns {Promise<Array>} - ผลลัพธ์การค้นหา
 */
export async function retrieveRelevantSubmissions({ assignmentId, query, limit = 5 }) {
  try {
    // 1. สร้าง embedding จากคำถาม
    const queryEmbedding = await createQueryEmbedding(query);
    
    // 2. ค้นหางานนักเรียนที่เกี่ยวข้อง
    const results = await searchSimilarVectors(
      COLLECTIONS.SUBMISSIONS,
      queryEmbedding,
      {
        must: [
          {
            key: 'assignment_id',
            match: { value: assignmentId }
          }
        ]
      },
      limit
    );
    
    // 3. จัดรูปแบบผลลัพธ์
    return results.map(result => ({
      id: result.id,
      content: result.payload.content,
      score: result.score,
      submission_id: result.payload.submission_id,
      student_id: result.payload.student_id,
      chunk_index: result.payload.chunk_index
    }));
  } catch (error) {
    console.error('Error retrieving relevant submissions:', error);
    return [];
  }
}

/**
 * เปรียบเทียบงานนักเรียนกับเฉลยอาจารย์
 * @param {Object} params - พารามิเตอร์
 * @param {string} params.assignmentId - ID ของงาน
 * @param {string} params.submissionId - ID ของงานที่นักเรียนส่ง
 * @param {number} params.limit - จำนวนผลลัพธ์สูงสุดต่อส่วน
 * @returns {Promise<Object>} - ผลการเปรียบเทียบ
 */
export async function compareSubmissionWithSolution({ assignmentId, submissionId, limit = 3 }) {
  try {
    // 1. ดึงข้อมูลงานนักเรียน
    const submissionResults = await searchSimilarVectors(
      COLLECTIONS.SUBMISSIONS,
      null, // ไม่ใช้ vector ในการค้นหา
      {
        must: [
          {
            key: 'submission_id',
            match: { value: submissionId }
          }
        ]
      },
      100 // ดึงทั้งหมด
    );
    
    // ถ้าไม่พบข้อมูลงานนักเรียน
    if (!submissionResults || submissionResults.length === 0) {
      return {
        success: false,
        message: 'ไม่พบข้อมูลงานนักเรียน'
      };
    }
    
    // 2. เรียงลำดับตาม chunk_index
    const sortedSubmission = submissionResults
      .sort((a, b) => a.payload.chunk_index - b.payload.chunk_index)
      .map(result => result.payload.content);
    
    // 3. ค้นหาเฉลยที่เกี่ยวข้องสำหรับแต่ละส่วนของงานนักเรียน
    const comparisons = [];
    
    for (const chunk of sortedSubmission) {
      const relevantSolutions = await retrieveRelevantSolutions({
        assignmentId,
        query: chunk,
        limit
      });
      
      comparisons.push({
        submission_chunk: chunk,
        relevant_solutions: relevantSolutions
      });
    }
    
    return {
      success: true,
      comparisons,
      submission_full: sortedSubmission.join('\n\n')
    };
  } catch (error) {
    console.error('Error comparing submission with solution:', error);
    return {
      success: false,
      message: error.message
    };
  }
}