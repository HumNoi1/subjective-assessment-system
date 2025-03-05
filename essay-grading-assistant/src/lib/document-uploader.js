// src/lib/document-uploader.js
import { v4 as uuidv4 } from 'uuid';
import { extractTextFromPdf, isPDF } from './utils/pdf-loader';
import { splitTextIntoChunks } from './utils/text-splitter';
import { createEmbeddings, createMockEmbeddings } from './utils/embeddings';
import { 
  COLLECTIONS, 
  createCollectionIfNotExists, 
  deletePointsByFilter, 
  upsertPoints 
} from './utils/qdrant-client';

/**
 * อัปโหลดเฉลยอาจารย์เข้าสู่ Qdrant
 * @param {Object} params - พารามิเตอร์
 * @param {string} params.solutionId - ID ของเฉลย
 * @param {string} params.assignmentId - ID ของงาน
 * @param {string} params.teacherId - ID ของอาจารย์
 * @param {Buffer|Blob|string} params.fileContent - เนื้อหาไฟล์
 * @returns {Promise<Object>} - ผลลัพธ์การอัปโหลด
 */
export async function uploadSolutionToVectorDB({ 
  solutionId, 
  assignmentId, 
  teacherId, 
  fileContent 
}) {
  try {
    // ตรวจสอบว่ามีข้อมูลที่จำเป็นครบถ้วน
    if (!solutionId || !assignmentId || !teacherId || !fileContent) {
      throw new Error('Missing required parameters');
    }
    
    // 1. สร้าง collection ถ้ายังไม่มี
    await createCollectionIfNotExists(COLLECTIONS.SOLUTIONS);
    
    // 2. แปลงเนื้อหาไฟล์เป็นข้อความ
    let textContent;
    const isPdfContent = isPDF(fileContent);
    
    if (isPdfContent) {
      console.log('Processing PDF file...');
      textContent = await extractTextFromPdf(fileContent);
    } else {
      // สำหรับไฟล์ข้อความทั่วไป
      textContent = fileContent.toString();
    }
    
    // 3. แบ่งข้อความเป็นชิ้นเล็กๆ
    const textChunks = await splitTextIntoChunks(textContent);
    
    if (textChunks.length === 0) {
      throw new Error('No text chunks were created from the document');
    }
    
    // 4. สร้าง embeddings
    let embeddings;
    try {
      embeddings = await createEmbeddings(textChunks);
    } catch (embeddingError) {
      console.error('Error creating embeddings:', embeddingError);
      console.warn('Using mock embeddings instead');
      embeddings = createMockEmbeddings(textChunks.length);
    }
    
    // 5. ลบข้อมูลเก่าของเฉลยนี้ (ถ้ามี)
    await deletePointsByFilter(COLLECTIONS.SOLUTIONS, {
      must: [
        {
          key: 'solution_id',
          match: { value: solutionId }
        }
      ]
    });
    
    // 6. เตรียมข้อมูลสำหรับอัปโหลดเข้า Qdrant
    const points = textChunks.map((chunk, index) => ({
      id: `${solutionId}_${index}`,
      vector: embeddings[index],
      payload: {
        solution_id: solutionId,
        assignment_id: assignmentId,
        teacher_id: teacherId,
        content: chunk,
        chunk_index: index,
        created_at: new Date().toISOString()
      }
    }));
    
    // 7. อัปโหลดเข้า Qdrant
    const result = await upsertPoints(COLLECTIONS.SOLUTIONS, points);
    
    return {
      success: result.status === 'success',
      message: result.message,
      chunks_count: textChunks.length,
      vectors_count: points.length,
      is_pdf: isPdfContent
    };
  } catch (error) {
    console.error('Error uploading solution to vector database:', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
}

/**
 * อัปโหลดงานนักเรียนเข้าสู่ Qdrant
 * @param {Object} params - พารามิเตอร์
 * @param {string} params.submissionId - ID ของงานที่นักเรียนส่ง
 * @param {string} params.assignmentId - ID ของงาน
 * @param {string} params.studentId - ID ของนักเรียน
 * @param {Buffer|Blob|string} params.fileContent - เนื้อหาไฟล์
 * @returns {Promise<Object>} - ผลลัพธ์การอัปโหลด
 */
export async function uploadSubmissionToVectorDB({ 
  submissionId, 
  assignmentId, 
  studentId, 
  fileContent 
}) {
  try {
    // ตรวจสอบว่ามีข้อมูลที่จำเป็นครบถ้วน
    if (!submissionId || !assignmentId || !studentId || !fileContent) {
      throw new Error('Missing required parameters');
    }
    
    // 1. สร้าง collection ถ้ายังไม่มี
    await createCollectionIfNotExists(COLLECTIONS.SUBMISSIONS);
    
    // 2. แปลงเนื้อหาไฟล์เป็นข้อความ
    let textContent;
    const isPdfContent = isPDF(fileContent);
    
    if (isPdfContent) {
      console.log('Processing PDF file...');
      textContent = await extractTextFromPdf(fileContent);
    } else {
      // สำหรับไฟล์ข้อความทั่วไป
      textContent = fileContent.toString();
    }
    
    // 3. แบ่งข้อความเป็นชิ้นเล็กๆ
    const textChunks = await splitTextIntoChunks(textContent);
    
    if (textChunks.length === 0) {
      throw new Error('No text chunks were created from the document');
    }
    
    // 4. สร้าง embeddings
    let embeddings;
    try {
      embeddings = await createEmbeddings(textChunks);
    } catch (embeddingError) {
      console.error('Error creating embeddings:', embeddingError);
      console.warn('Using mock embeddings instead');
      embeddings = createMockEmbeddings(textChunks.length);
    }
    
    // 5. ลบข้อมูลเก่าของงานนี้ (ถ้ามี)
    await deletePointsByFilter(COLLECTIONS.SUBMISSIONS, {
      must: [
        {
          key: 'submission_id',
          match: { value: submissionId }
        }
      ]
    });
    
    // 6. เตรียมข้อมูลสำหรับอัปโหลดเข้า Qdrant
    const points = textChunks.map((chunk, index) => ({
      id: `${submissionId}_${index}`,
      vector: embeddings[index],
      payload: {
        submission_id: submissionId,
        assignment_id: assignmentId,
        student_id: studentId,
        content: chunk,
        chunk_index: index,
        created_at: new Date().toISOString()
      }
    }));
    
    // 7. อัปโหลดเข้า Qdrant
    const result = await upsertPoints(COLLECTIONS.SUBMISSIONS, points);
    
    return {
      success: result.status === 'success',
      message: result.message,
      chunks_count: textChunks.length,
      vectors_count: points.length,
      is_pdf: isPdfContent
    };
  } catch (error) {
    console.error('Error uploading submission to vector database:', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
}