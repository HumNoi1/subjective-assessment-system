// src/lib/initialize.js
import { initializeMilvus } from './milvus';

export async function initializeSystem() {
  console.log('Initializing system...');
  
  // เริ่มต้น Milvus
  const milvusInitialized = await initializeMilvus();
  if (!milvusInitialized) {
    console.error('Failed to initialize Milvus');
  }
  
  console.log('System initialization completed');
}