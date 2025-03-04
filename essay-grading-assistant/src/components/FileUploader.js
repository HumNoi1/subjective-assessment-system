// File: components/FileUploader.js
'use client'

import { useState } from 'react';
import { uploadSolutionFile, uploadSubmissionFile } from '@/lib/storage';
import { useAuth } from '@/components/AuthProvider';

export default function FileUploader({ 
  type = 'solution', 
  assignmentId, 
  studentId = null,
  onFileUploaded 
}) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('กรุณาเลือกไฟล์ที่ต้องการอัปโหลด');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      let uploadResult;
      
      if (type === 'solution') {
        uploadResult = await uploadSolutionFile(file, user.id, assignmentId);
      } else if (type === 'submission') {
        if (!studentId) {
          throw new Error('กรุณาระบุรหัสนักศึกษา');
        }
        uploadResult = await uploadSubmissionFile(file, user.id, assignmentId, studentId);
      } else {
        throw new Error('ประเภทการอัปโหลดไม่ถูกต้อง');
      }

      if (onFileUploaded) {
        onFileUploaded(uploadResult);
      }

      setFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-800">
          {error}
        </div>
      )}
      
      <div className="flex items-center gap-4">
        <input
          type="file"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
                    file:mr-4 file:rounded-md file:border-0
                    file:bg-blue-50 file:px-4 file:py-2
                    file:text-sm file:font-semibold file:text-blue-700
                    hover:file:bg-blue-100"
          disabled={isUploading}
        />
        
        <button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white 
                   hover:bg-blue-700 disabled:bg-blue-300"
        >
          {isUploading ? 'กำลังอัปโหลด...' : 'อัปโหลด'}
        </button>
      </div>
    </div>
  );
}