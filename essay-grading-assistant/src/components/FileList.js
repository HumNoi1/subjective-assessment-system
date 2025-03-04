// File: components/FileList.js
'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';

export default function FileList({ 
  type = 'solution', 
  assignmentId, 
  studentId = null,
  onFileDeleted 
}) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        
        const res = await fetch(
          `/api/storage/folders?teacherId=${user.id}&assignmentId=${assignmentId}` + 
          (studentId ? `&studentId=${studentId}` : '') + 
          `&type=${type}`
        );
        
        if (!res.ok) throw new Error('ไม่สามารถดึงข้อมูลไฟล์ได้');
        
        const data = await res.json();
        setFiles(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user && assignmentId) {
      fetchFiles();
    }
  }, [user, assignmentId, studentId, type]);

  const handleDelete = async (filePath) => {
    try {
      const res = await fetch('/api/storage/file', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bucket: type === 'solution' ? 'teacher_solutions' : 'student_submissions',
          filePath
        }),
      });
      
      if (!res.ok) throw new Error('ไม่สามารถลบไฟล์ได้');
      
      setFiles(prevFiles => prevFiles.filter(file => 
        file.name !== filePath.split('/').pop()
      ));
      
      if (onFileDeleted) {
        onFileDeleted(filePath);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const getFileUrl = (bucket, filePath) => {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`;
  };

  if (loading) return <p className="text-sm text-gray-500">กำลังโหลดรายการไฟล์...</p>;
  if (error) return <p className="text-sm text-red-500">ผิดพลาด: {error}</p>;
  if (files.length === 0) return <p className="text-sm text-gray-500">ไม่พบไฟล์</p>;

  return (
    <ul className="space-y-2">
      {files.map((file) => {
        const bucket = type === 'solution' ? 'teacher_solutions' : 'student_submissions';
        let filePath = `${user.id}/${assignmentId}/${file.name}`;
        
        if (type === 'submission' && studentId) {
          filePath = `${user.id}/${assignmentId}/${studentId}/${file.name}`;
        }
        
        return (
          <li key={file.id || file.name} className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
              <span>{file.name}</span>
            </div>
            
            <div className="flex items-center gap-2">
              
              <a href={getFileUrl(bucket, filePath)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100">
                เปิดไฟล์
              </a>
              
              <button
                onClick={() => handleDelete(filePath)}
                className="rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
              >
                ลบ
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}