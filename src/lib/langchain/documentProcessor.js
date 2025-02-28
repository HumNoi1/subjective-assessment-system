// lib/langchain/documentProcessor.js
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { createVectorStore } from './embeddings';

// แบ่งเอกสารเป็นส่วนย่อย
export const splitDocument = async (documentText) => {
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  return await textSplitter.createDocuments([documentText]);
};

// บันทึกเอกสารลงใน Vector Store
export const storeDocumentEmbeddings = async (documents, tableName, metadata = {}) => {
  const vectorStore = await createVectorStore(tableName);
  
  // เพิ่ม metadata ให้กับแต่ละ chunk
  const documentsWithMetadata = documents.map(doc => {
    return {
      ...doc,
      metadata: {
        ...doc.metadata,
        ...metadata
      }
    };
  });
  
  return await vectorStore.addDocuments(documentsWithMetadata);
};