// src/app/dashboard/subjects/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [teacherId, setTeacherId] = useState(null);
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [currentSubjectId, setCurrentSubjectId] = useState(null);
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
          
          // ดึงข้อมูลชั้นเรียน
          const { data: classesData } = await supabase
            .from('classes')
            .select('*')
            .eq('teacher_id', teacherData.teacher_id)
            .order('academic_year', { ascending: false });
          
          setClasses(classesData || []);
          
          // ดึงข้อมูลวิชา
          const { data: subjectsData, error: subjectsError } = await supabase
            .from('subjects')
            .select(`
              *,
              classes (
                class_name,
                academic_year
              )
            `)
            .eq('teacher_id', teacherData.teacher_id)
            .order('created_at', { ascending: false });
          
          if (subjectsError) {
            throw subjectsError;
          }
          
          setSubjects(subjectsData || []);
        }
      } catch (error) {
        console.error('Error fetching subjects:', error);
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [router]);

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    
    if (!subjectName || !subjectCode || !selectedClass) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    
    try {
      setCreating(true);
      setError(null);
      
      const response = await fetch('/api/subjects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subjectName,
          subjectCode,
          teacherId,
          classId: selectedClass
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการสร้างวิชา');
      }
      
      // ค้นหาข้อมูลชั้นเรียนที่เกี่ยวข้อง
      const relatedClass = classes.find(c => c.class_id.toString() === selectedClass);
      
      // อัปเดตรายการวิชา
      setSubjects(prevSubjects => [{
        ...data.subject,
        classes: {
          class_name: relatedClass.class_name,
          academic_year: relatedClass.academic_year
        }
      }, ...prevSubjects]);
      
      // รีเซ็ตฟอร์ม
      setSubjectName('');
      setSubjectCode('');
      setSelectedClass('');
      
      setSuccessMessage('สร้างวิชาสำเร็จ');
      
      // ซ่อนข้อความสำเร็จหลังจาก 3 วินาที
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error creating subject:', error);
      setError(error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleEditSubject = async (e) => {
    e.preventDefault();
    
    if (!subjectName || !subjectCode || !selectedClass) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    
    try {
      setEditing(true);
      setError(null);
      
      const response = await fetch(`/api/subjects/${currentSubjectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subjectName,
          subjectCode,
          teacherId,
          classId: selectedClass
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการแก้ไขวิชา');
      }
      
      // ค้นหาข้อมูลชั้นเรียนที่เกี่ยวข้อง
      const relatedClass = classes.find(c => c.class_id.toString() === selectedClass);
      
      // อัปเดตรายการวิชา
      setSubjects(prevSubjects => 
        prevSubjects.map(subject => 
          subject.subject_id === currentSubjectId 
            ? {
                ...data.subject,
                classes: {
                  class_name: relatedClass.class_name,
                  academic_year: relatedClass.academic_year
                }
              } 
            : subject
        )
      );
      
      // รีเซ็ตฟอร์ม
      setSubjectName('');
      setSubjectCode('');
      setSelectedClass('');
      setCurrentSubjectId(null);
      
      setSuccessMessage('แก้ไขวิชาสำเร็จ');
      
      // ซ่อนข้อความสำเร็จหลังจาก 3 วินาที
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error editing subject:', error);
      setError(error.message);
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!confirm('คุณต้องการลบวิชานี้ใช่หรือไม่?')) {
      return;
    }
    
    try {
      setDeleting(true);
      setError(null);
      
      const response = await fetch(`/api/subjects/${subjectId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการลบวิชา');
      }
      
      // อัปเดตรายการวิชา
      setSubjects(prevSubjects => 
        prevSubjects.filter(subject => subject.subject_id !== subjectId)
      );
      
      setSuccessMessage('ลบวิชาสำเร็จ');
      
      // ซ่อนข้อความสำเร็จหลังจาก 3 วินาที
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error deleting subject:', error);
      setError(error.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleEditClick = (subject) => {
    setSubjectName(subject.subject_name);
    setSubjectCode(subject.subject_code);
    setSelectedClass(subject.class_id.toString());
    setCurrentSubjectId(subject.subject_id);
  };

  const handleCancelEdit = () => {
    setSubjectName('');
    setSubjectCode('');
    setSelectedClass('');
    setCurrentSubjectId(null);
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
      <h1 className="text-2xl font-bold mb-6">จัดการวิชาเรียน</h1>
      
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
      
      {/* ฟอร์มสร้าง/แก้ไขวิชา */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">
          {currentSubjectId ? 'แก้ไขวิชา' : 'สร้างวิชาใหม่'}
        </h2>
        
        <form onSubmit={currentSubjectId ? handleEditSubject : handleCreateSubject} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ชื่อวิชา
              </label>
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="เช่น คณิตศาสตร์"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                รหัสวิชา
              </label>
              <input
                type="text"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="เช่น ค33101"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ชั้นเรียน
              </label>
              <select
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                required
              >
                <option value="">เลือกชั้นเรียน</option>
                {classes.map((cls) => (
                  <option key={cls.class_id} value={cls.class_id}>
                    {cls.class_name} (ปีการศึกษา {cls.academic_year})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            {currentSubjectId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                ยกเลิก
              </button>
            )}
            
            <button
              type="submit"
              disabled={creating || editing}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {(creating || editing) ? (
                <>
                  <span className="animate-spin inline-block h-4 w-4 border-t-2 border-white rounded-full mr-2"></span>
                  {currentSubjectId ? 'กำลังแก้ไข...' : 'กำลังสร้าง...'}
                </>
              ) : (
                currentSubjectId ? 'แก้ไขวิชา' : 'สร้างวิชา'
              )}
            </button>
          </div>
        </form>
      </div>
      
      {/* รายการวิชา */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">รายการวิชาทั้งหมด</h2>
        </div>
        
        {subjects.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            ไม่มีรายการวิชา
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ชื่อวิชา
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    รหัสวิชา
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ชั้นเรียน
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subjects.map((subject) => (
                  <tr key={subject.subject_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {subject.subject_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {subject.subject_code}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {subject.classes?.class_name} ({subject.classes?.academic_year})
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => router.push(`/dashboard/answer-keys?subjectId=${subject.subject_id}`)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          ไฟล์เฉลย
                        </button>
                        
                        <button
                          onClick={() => handleEditClick(subject)}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          แก้ไข
                        </button>
                        
                        <button
                          onClick={() => handleDeleteSubject(subject.subject_id)}
                          disabled={deleting}
                          className="text-red-600 hover:text-red-900 disabled:text-red-300 disabled:cursor-not-allowed"
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