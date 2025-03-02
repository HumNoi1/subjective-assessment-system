// src/app/dashboard/folders/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function FoldersPage() {
  const [folders, setFolders] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [teacherId, setTeacherId] = useState(null);
  const [folderName, setFolderName] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch teacher data
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }
        
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('*')
          .eq('teacher_id', session.user.id)
          .single();
        
        if (teacherData) {
          setTeacherId(teacherData.teacher_id);
          
          // Fetch subjects
          const { data: subjectsData } = await supabase
            .from('subjects')
            .select('*')
            .eq('teacher_id', teacherData.teacher_id);
          
          setSubjects(subjectsData || []);
          
          // Fetch folders
          const { data: foldersData } = await supabase
            .from('folders')
            .select('*, subjects(subject_name)')
            .eq('teacher_id', teacherData.teacher_id)
            .order('creation_date', { ascending: false });
          
          setFolders(foldersData || []);
        }
      } catch (error) {
        console.error('Error fetching folders:', error);
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [router]);

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    
    if (!folderName || !selectedSubject) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    
    try {
      setCreating(true);
      setError(null);
      
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderName,
          teacherId,
          subjectId: selectedSubject
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการสร้างโฟลเดอร์');
      }
      
      // Update folders list
      const subjectName = subjects.find(s => s.subject_id.toString() === selectedSubject)?.subject_name;
      
      setFolders(prevFolders => [
        {
          ...data.folder,
          subjects: { subject_name: subjectName }
        },
        ...prevFolders
      ]);
      
      // Reset form
      setFolderName('');
      setSelectedSubject('');
      
      setSuccessMessage('สร้างโฟลเดอร์สำเร็จ');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error creating folder:', error);
      setError(error.message);
    } finally {
      setCreating(false);
    }
  };

  // Add handleEditFolder, handleDeleteFolder, etc.

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6 text-black">จัดการโฟลเดอร์</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p>{successMessage}</p>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4 text-black">
          {currentFolderId ? 'แก้ไขโฟลเดอร์' : 'สร้างโฟลเดอร์ใหม่'}
        </h2>
        
        <form onSubmit={handleCreateFolder} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ชื่อโฟลเดอร์
              </label>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-black"
                placeholder="ชื่อโฟลเดอร์"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                วิชา
              </label>
              <select
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-black"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                required
              >
                <option value="">เลือกวิชา</option>
                {subjects.map((subject) => (
                  <option key={subject.subject_id} value={subject.subject_id}>
                    {subject.subject_name} ({subject.subject_code})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {creating ? 'กำลังสร้าง...' : 'สร้างโฟลเดอร์'}
            </button>
          </div>
        </form>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-black">รายการโฟลเดอร์ทั้งหมด</h2>
        </div>
        
        {folders.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            ไม่มีรายการโฟลเดอร์
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ชื่อโฟลเดอร์
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วิชา
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วันที่สร้าง
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {folders.map((folder) => (
                  <tr key={folder.folder_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {folder.folder_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {folder.subjects?.subject_name || 'ไม่ระบุวิชา'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(folder.creation_date).toLocaleDateString('th-TH')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => router.push(`/dashboard/folders/${folder.folder_id}/student-answers`)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          คำตอบนักเรียน
                        </button>
                        <button
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          แก้ไข
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900"
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}