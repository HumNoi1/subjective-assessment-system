// src/app/api/vectordb/status/route.js
import { NextResponse } from 'next/server';
import { checkQdrantConnection, createCollectionIfNotExists, COLLECTIONS } from '@/lib/utils/qdrant-client';

export async function GET() {
  try {
    // ตรวจสอบการเชื่อมต่อกับ Qdrant
    const connectionStatus = await checkQdrantConnection();
    
    // ถ้าเชื่อมต่อได้ ทดสอบสร้าง collections
    let collectionsStatus = { status: 'not_checked' };
    if (connectionStatus.status === 'connected') {
      // สร้าง collection ถ้ายังไม่มี
      const solutionsCollection = await createCollectionIfNotExists(COLLECTIONS.SOLUTIONS);
      const submissionsCollection = await createCollectionIfNotExists(COLLECTIONS.SUBMISSIONS);
      
      collectionsStatus = {
        status: 'checked',
        solutions: solutionsCollection,
        submissions: submissionsCollection
      };
    }
    
    // รายละเอียดการตั้งค่า
    const configInfo = {
      qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6333',
      hasQdrantApiKey: process.env.QDRANT_API_KEY ? 'yes' : 'no',
      openaiApiKey: process.env.OPENAI_API_KEY ? 'configured' : 'not configured',
      lmstudioEndpoint: process.env.LMSTUDIO_EMBEDDING_ENDPOINT || 'not configured'
    };
    
    return NextResponse.json({
      connection: connectionStatus,
      collections: collectionsStatus,
      config: configInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking vector database status:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}