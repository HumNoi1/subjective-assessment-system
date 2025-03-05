// File: src/app/api/vector-db/check/route.js
import { NextResponse } from 'next/server';
import qdrantClient, { checkConnection, ensureCollections } from '@/lib/qdrant';

export async function GET() {
  try {
    // ตรวจสอบการเชื่อมต่อกับ Qdrant
    const connectionStatus = await checkConnection();
    
    // ถ้าเชื่อมต่อได้ ทดสอบสร้าง collections
    let collectionsStatus = { status: 'not_checked' };
    if (connectionStatus.status === 'connected') {
      collectionsStatus = await ensureCollections();
    }
    
    return NextResponse.json({
      connection: connectionStatus,
      collections: collectionsStatus,
      env: {
        qdrantUrl: process.env.QDRANT_URL || 'not set',
        hasApiKey: process.env.QDRANT_API_KEY ? 'yes' : 'no'
      }
    });
  } catch (error) {
    console.error('Error checking Qdrant:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}