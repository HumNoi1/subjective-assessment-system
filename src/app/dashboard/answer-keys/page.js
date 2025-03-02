// src/app/dashboard/answer-keys/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AnswerKeysPage() {
  const [answerKeys, setAnswerKeys] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [teacherId, setTeacherId] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
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
          .eq('teacher_id', session.user.id)
          .single();
        
        if (teacherData) {
          setTeacherId(teacherData.teacher_id);
          
          // ดึงข้อมูลวิชาที่สอน
          const { data: subjectsData } = await supabase
            .from('subjects')
            .select('*')
            .eq('teacher_id', teacherData.teacher_id);
          
          setSubjects(subjectsData || []);
          
          // ดึงข้อมูลเทอมเรียน
          const { data: termsData } = await supabase
            .from('terms')
            .select('*')
            .order('start_date', { ascending: false });
          
          setTerms(termsData || []);
          
          // ดึงข้อมูลไฟล์เฉลย
          const { data: answerKeysData } = await supabase
            .from('answer_keys')
            .select(`
              *,
              subjects (subject_name),
              terms (term_name)
            `)
            .in('subject_id', subjectsData?.map(subject => subject.subject_id) || [])
            .order('created_at', { ascending: false });
          
          setAnswerKeys(answerKeysData || []);
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
      
      if (!file || !selectedSubject || !selectedTerm) {
        setError('กรุณาเลือกไฟล์, วิชา และเทอมเรียน');
        return;
      }
      
      try {
        setUploading(true);
        setError(null);
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('subjectId', selectedSubject);
        formData.append('termId', selectedTerm);
        
        const response = await fetch('/api/answer-keys', {
          method: 'POST',
          body: formData,
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
        }
        
        // อัปเดตรายการไฟล์เฉลย พร้อมค่า has_embeddings ที่อัปเดตจาก API
        setAnswerKeys(prevKeys => [data.answerKey, ...prevKeys]);
        
        // รีเซ็ตฟอร์ม
        setFile(null);
        setSelectedSubject('');
        setSelectedTerm('');
        document.getElementById('file-upload').value = '';
        
        setSuccessMessage(
          data.answerKey.has_embeddings 
            ? 'อัปโหลดไฟล์เฉลยและสร้าง Embeddings สำเร็จ'
            : 'อัปโหลดไฟล์เฉลยสำเร็จ แต่ยังไม่ได้สร้าง Embeddings'
        );
        
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

  const handleDeleteAnswerKey = async (answerKeyId) => {
    if (!confirm('คุณต้องการลบไฟล์เฉลยนี้ใช่หรือไม่?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/answer-keys/${answerKeyId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการลบไฟล์');
      }
      
      // อัปเดตรายการไฟล์เฉลย
      setAnswerKeys(prevKeys => prevKeys.filter(key => key.answer_key_id !== answerKeyId));
      
      setSuccessMessage('ลบไฟล์เฉลยสำเร็จ');
      
      // ซ่อนข้อความสำเร็จหลังจาก 3 วินาที
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error deleting answer key:', error);
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
      <h1 className="text-2xl font-bold mb-6 text-black">จัดการไฟล์เฉลย</h1>
      
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
      
      {/* ฟอร์มอัปโหลดไฟล์เฉลย */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4 text-black">อัปโหลดไฟล์เฉลยใหม่</h2>
        
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                วิชา
              </label>
              <select
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                required
              >
                <option value="" className="text-black">เลือกวิชา</option>
                {subjects.map((subject) => (
                  <option key={subject.subject_id} value={subject.subject_id}>
                    {subject.subject_name} ({subject.subject_code})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                เทอมเรียน
              </label>
              <select
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                required
              >
                <option value="">เลือกเทอมเรียน</option>
                {terms.map((term) => (
                  <option key={term.term_id} value={term.term_id}>
                    {term.term_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ไฟล์เฉลย
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
          
          <div>
            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดไฟล์เฉลย'}
            </button>
          </div>
        </form>
      </div>
      
      {/* รายการไฟล์เฉลย */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">รายการไฟล์เฉลยทั้งหมด</h2>
        </div>
        
        {answerKeys.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            ไม่มีรายการไฟล์เฉลย
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ชื่อไฟล์
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วิชา
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    เทอมเรียน
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Embeddings
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
                {answerKeys.map((answerKey) => (
                  <tr key={answerKey.answer_key_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="text-sm font-medium text-gray-900">
                          {answerKey.file_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {answerKey.subjects?.subject_name || 'ไม่ระบุวิชา'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {answerKey.terms?.term_name || 'ไม่ระบุเทอม'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        answerKey.has_embeddings
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {answerKey.has_embeddings ? 'สร้างแล้ว' : 'ยังไม่ได้สร้าง'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(answerKey.created_at).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => router.push(`/dashboard/answer-keys/${answerKey.answer_key_id}`)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          ดู
                        </button>
                        
                        {!answerKey.has_embeddings && (
                          <button
                            onClick={async () => {
                              try {
                                setLoading(true);
                                const response = await fetch('/api/embeddings/answer-key', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({
                                    answerKeyId: answerKey.answer_key_id,
                                  }),
                                });
                                
                                const result = await response.json();
                                
                                if (response.ok) {
                                  // อัปเดตสถานะ has_embeddings
                                  setAnswerKeys(prevKeys => prevKeys.map(key => 
                                    key.answer_key_id === answerKey.answer_key_id 
                                      ? { ...key, has_embeddings: true }
                                      : key
                                  ));
                                  
                                  setSuccessMessage('สร้าง Embeddings สำเร็จ');
                                  
                                  setTimeout(() => {
                                    setSuccessMessage(null);
                                  }, 3000);
                                } else {
                                  throw new Error(result.error);
                                }
                              } catch (error) {
                                console.error('Error creating embeddings:', error);
                                setError(error.message);
                              } finally {
                                setLoading(false);
                              }
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            สร้าง Embeddings
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDeleteAnswerKey(answerKey.answer_key_id)}
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