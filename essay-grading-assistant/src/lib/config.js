// File: lib/config.js
// ไฟล์นี้ใช้สำหรับเก็บค่าตั้งต้นและการกำหนดค่าต่างๆ ของระบบ

// ตั้งค่า LMStudio
export const LM_STUDIO = {
    CHAT_ENDPOINT: process.env.LMSTUDIO_ENDPOINT || 'http://localhost:1234/v1/chat/completions',
    EMBEDDING_ENDPOINT: process.env.LMSTUDIO_EMBEDDING_ENDPOINT || 'http://localhost:1234/v1/embeddings',
    API_KEY: process.env.LMSTUDIO_API_KEY || 'lm-studio',
    MODEL: 'bartowski/llama-3.2-3b-instruct' // ชื่อโมเดลใน LMStudio
  };
  
  // ตั้งค่า Qdrant
  export const QDRANT = {
    URL: process.env.QDRANT_URL || 'http://localhost:6333',
    API_KEY: process.env.QDRANT_API_KEY || '',
    COLLECTIONS: {
      SOLUTIONS: 'solution_embeddings',
      SUBMISSIONS: 'submission_embeddings'
    },
    VECTOR_SIZE: 1536, // ขนาดของ embedding vector
    DISTANCE: 'Cosine'
  };
  
  // ตั้งค่า Embedding
  export const EMBEDDING = {
    CHUNK_SIZE: 300, // จำนวนคำสูงสุดต่อ chunk
    CHUNK_OVERLAP: 50, // จำนวนคำที่ซ้อนทับ
    USE_MOCK: true, // ใช้ mock embedding เพื่อทดสอบระบบ
    RETRIES: 2, // จำนวนครั้งที่ลองใหม่เมื่อล้มเหลว
    TIMEOUT: 30000 // timeout 30 วินาที
  };
  
  // ตั้งค่าการประมวลผลไฟล์
  export const FILE_PROCESSING = {
    MAX_CONTENT_LENGTH: 10000, // ความยาวสูงสุดของเนื้อหาที่จะประมวลผล
    SUPPORTED_EXTENSIONS: ['.txt', '.pdf', '.docx', '.md'] // นามสกุลไฟล์ที่รองรับ
  };
  
  // ตั้งค่าเกณฑ์การตรวจข้อสอบ
  export const GRADING = {
    CONTENT_WEIGHT: 60, // น้ำหนักคะแนนด้านเนื้อหา (%)
    LANGUAGE_WEIGHT: 20, // น้ำหนักคะแนนด้านภาษา (%)
    APPLICATION_WEIGHT: 20, // น้ำหนักคะแนนด้านการประยุกต์ใช้ (%)
    MAX_SCORE: 100 // คะแนนเต็ม
  };