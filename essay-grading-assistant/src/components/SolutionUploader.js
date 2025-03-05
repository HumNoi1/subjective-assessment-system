// src/components/SolutionUploader.jsx
'use client'

import { useState } from 'react';

export default function SolutionUploader({ assignmentId, teacherId, onSuccess }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [vectorStatus, setVectorStatus] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setMessage('');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('กรุณาเลือกไฟล์ที่ต้องการอัปโหลด');
      return;
    }
    
    try {
      setIsUploading(true);
      setError('');
      setMessage('กำลังอัปโหลดไฟล์...');
      
      // Step 1: อ่านไฟล์เป็น base64
      const fileContent = await readFileAsBase64(file);
      
      // Step 2: สร้าง ID สำหรับเฉลย
      const solutionId = `solution_${Date.now()}`;
      
      // Step 3: อัปโหลดเข้า Vector Database
      const response = await fetch('/api/vectordb/solution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          solutionId,
          assignmentId,
          teacherId,
          fileContent
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'เกิดข้อผิดพลาดในการอัปโหลด');
      }
      
      setMessage(`อัปโหลดสำเร็จ: ${data.chunks_count} chunks`);
      setVectorStatus(data);
      
      // เรียกฟังก์ชัน callback หากมีการกำหนด
      if (onSuccess) {
        onSuccess({
          solutionId,
          filename: file.name,
          ...data
        });
      }
      
      // ล้างค่า
      setFile(null);
      
    } catch (err) {
      console.error('Error uploading solution:', err);
      setError(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // อ่านไฟล์เป็น base64
  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // ดึงเฉพาะ base64 data จาก data URL
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-medium mb-4">อัปโหลดเฉลยอาจารย์</h3>
      
      <form onSubmit={handleUpload}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            เลือกไฟล์ (PDF หรือ TXT)
          </label>
          <input
            type="file"
            accept=".pdf,.txt,.doc,.docx"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
            disabled={isUploading}
          />
          {file && (
            <p className="mt-2 text-sm text-gray-500">
              ไฟล์ที่เลือก: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}
        
        {message && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">
            {message}
          </div>
        )}
        
        <button
          type="submit"
          disabled={isUploading || !file}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition"
        >
          {isUploading ? 'กำลังอัปโหลด...' : 'อัปโหลดเข้า Vector Database'}
        </button>
      </form>
      
      {vectorStatus && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm">
          <h4 className="font-medium mb-2">สถานะ Vector Database:</h4>
          <ul className="space-y-1">
            <li><span className="font-medium">ประเภทไฟล์:</span> {vectorStatus.is_pdf ? 'PDF' : 'Text'}</li>
            <li><span className="font-medium">จำนวน Chunks:</span> {vectorStatus.chunks_count}</li>
            <li><span className="font-medium">จำนวน Vectors:</span> {vectorStatus.vectors_count}</li>
          </ul>
        </div>
      )}
    </div>
  );
}