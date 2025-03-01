// src/app/dashboard/student-answers/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function StudentAnswersPage() {
  const [studentAnswers, setStudentAnswers] = useState([]);
  const [students, setStudents] = useState([]);
  const [answerKeys, setAnswerKeys] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [teacherId, setTeacherId] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedAnswerKey, setSelectedAnswerKey] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ดึงข้อมูลอาจารย์ปัจจุบัน
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/login');
          return;
        }
        
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        
        if (teacherData) {
          setTeacherId(teacherData.teacher_id);
          
          // ดึงข้อมูลวิชาที่สอน
          const { data: subjectsData } = await supabase
            .from('subjects')
            .select('*')
            .eq('teacher_id', teacherData.teacher_id);
          
          // ดึงข้อมูลไฟล์เฉลย
          const { data: answerKeysData } = await supabase
            .from('answer_keys')
            .select(`
              *,
              subjects (subject_name)
            `)
            .in('subject_id', subjectsData?.map(subject => subject.subject_id) || [])
            .order('created_at', { ascending: false });
          
          setAnswerKeys(answerKeysData || []);
          
          // ดึงข้อมูลโฟลเดอร์
          const { data: foldersData } = await supabase
            .from('folders')
            .select(`
              *,
              subjects (subject_name)
            `)
            .eq('teacher_id', teacherData.teacher_id)
            .order('creation_date', { ascending: false });
          
          setFolders(foldersData || []);
          
          // ดึงข้อมูลชั้นเรียนที่รับผิดชอบ
          const { data: classesData } = await supabase
            .from('classes')
            .select('class_id')
            .eq('teacher_id', teacherData.teacher_id);
          
          // ดึงข้อมูลนักเรียนในชั้นเรียนที่รับผิดชอบ
          if (classesData && classesData.length > 0) {
            const { data: studentsData } = await supabase
              .from('students')
              .select('*, classes(class_name)')
              .in('class_id', classesData.map(cls => cls.class_id));
            
            setStudents(studentsData || []);
          }
          
          // ดึงข้อมูลคำตอบนักเรียน
          const { data: studentAnswersData } = await supabase
            .from('student_answers')
            .select(`
              *,
              students (name),
              answer_keys (
                file_name,
                subjects (subject_name)
              ),
              folders (folder_name)
            `)
            .order('created_at', { ascending: false });
          
          setStudentAnswers(studentAnswersData || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [router]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!file || !selectedStudent || !selectedAnswerKey || !selectedFolder) {
      setError('กรุณาเลือกไฟล์, นักเรียน, ไฟล์เฉลย และโฟลเดอร์');
      return;
    }
    
    try {
      setUploading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('studentId', selectedStudent);
      formData.append('answerKeyId', selectedAnswerKey);
      formData.append('folderId', selectedFolder);
      
      const response = await fetch('/api/student-answers', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
      }
      
      // อัปเดตรายการคำตอบนักเรียน
      const studentName = students.find(s => s.student_id.toString() === selectedStudent)?.name;
      const answerKeyInfo = answerKeys.find(k => k.answer_key_id.toString() === selectedAnswerKey);
      const folderName = folders.find(f => f.folder_id.toString() === selectedFolder)?.folder_name;
      
      const newStudentAnswer = {
        ...data.studentAnswer,
        students: { name: studentName },
        answer_keys: { 
          file_name: answerKeyInfo?.file_name,
          subjects: { subject_name: answerKeyInfo?.subjects?.subject_name }
        },
        folders: { folder_name: folderName }
      };
      
      setStudentAnswers(prevAnswers => [newStudentAnswer, ...prevAnswers]);
      
      // รีเซ็ตฟอร์ม
      setFile(null);
      setSelectedStudent('');
      setSelectedAnswerKey('');
      setSelectedFolder('');
      document.getElementById('file-upload').value = '';
      
      setSuccessMessage('อัปโหลดคำตอบนักเรียนสำเร็จ');
      
      // ซ่อนข้อความสำเร็จหลังจาก 3 วินาที
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteStudentAnswer = async (studentAnswerId) => {
    if (!confirm('คุณต้องการลบคำตอบนักเรียนนี้ใช่หรือไม่?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/student-answers/${studentAnswerId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการลบคำตอบนักเรียน');
      }
      
      // อัปเดตรายการคำตอบนักเรียน
      setStudentAnswers(prevAnswers => prevAnswers.filter(answer => answer.student_answer_id !== studentAnswerId));
      
      setSuccessMessage('ลบคำตอบนักเรียนสำเร็จ');
      
      // ซ่อนข้อความสำเร็จหลังจาก 3 วินาที
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error deleting student answer:', error);
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">จัดการคำตอบนักเรียน</h1>
      
      {/* แสดงข้อความผิดพลาด */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {/* แสดงข้อความสำเร็จ */}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p>{successMessage}</p>
        </div>
      )}
      
      {/* ฟอร์มอัปโหลดคำตอบนักเรียน */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">อัปโหลดคำตอบนักเรียน</h2>
        
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                นักเรียน
              </label>
              <select
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                required
              >
                <option value="">เลือกนักเรียน</option>
                {students.map((student) => (
                  <option key={student.student_id} value={student.student_id}>
                    {student.name} ({student.classes?.class_name})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ไฟล์เฉลย
              </label>
              <select
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={selectedAnswerKey}
                onChange={(e) => setSelectedAnswerKey(e.target.value)}
                required
              >
                <option value="">เลือกไฟล์เฉลย</option>
                {answerKeys.map((answerKey) => (
                  <option key={answerKey.answer_key_id} value={answerKey.answer_key_id}>
                    {answerKey.file_name} ({answerKey.subjects?.subject_name})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                โฟลเดอร์
              </label>
              <select
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                required
              >
                <option value="">เลือกโฟลเดอร์</option>
                {folders.map((folder) => (
                  <option key={folder.folder_id} value={folder.folder_id}>
                    {folder.folder_name} ({folder.subjects?.subject_name})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ไฟล์คำตอบ
              </label>
              <input
                id="file-upload"
                type="file"
                onChange={handleFileChange}
                className="w-full border border-gray-300 rounded-md p-2"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                รองรับไฟล์ .txt, .doc, .docx, .pdf (ขนาดสูงสุด 5MB)
              </p>
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดคำตอบนักเรียน'}
            </button>
          </div>
        </form>
      </div>
      
      {/* รายการคำตอบนักเรียน */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">รายการคำตอบนักเรียนทั้งหมด</h2>
        </div>
        
        {studentAnswers.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            ไม่มีรายการคำตอบนักเรียน
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ชื่อนักเรียน
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ชื่อไฟล์
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วิชา
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    โฟลเดอร์
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วันที่อัปโหลด
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {studentAnswers.map((answer) => (
                  <tr key={answer.student_answer_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {answer.students?.name || 'ไม่ระบุชื่อ'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="text-sm text-gray-900">
                          {answer.file_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {answer.answer_keys?.subjects?.subject_name || 'ไม่ระบุวิชา'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {answer.folders?.folder_name || 'ไม่ระบุโฟลเดอร์'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(answer.created_at).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => router.push(`/dashboard/student-answers/${answer.student_answer_id}`)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          ดู
                        </button>
                        
                        <button
                          onClick={() => {
                            // สร้าง assessment ใหม่
                            router.push(`/dashboard/assessments/create?studentAnswerId=${answer.student_answer_id}&answerKeyId=${answer.answer_key_id}`);
                          }}
                          className="text-green-600 hover:text-green-900"
                        >
                          ตรวจคำตอบ
                        </button>
                        
                        <button
                          onClick={() => handleDeleteStudentAnswer(answer.student_answer_id)}
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