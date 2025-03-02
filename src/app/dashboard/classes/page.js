// src/app/dashboard/classes/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [teacherId, setTeacherId] = useState(null);
  const [className, setClassName] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [currentClassId, setCurrentClassId] = useState(null);
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

          // save data teacher id
          setTeacherId(teacherData.teacher_id);
          
          // ดึงข้อมูลชั้นเรียน
          const { data: classesData, error: classesError } = await supabase
            .from('classes')
            .select('*')
            .eq('teacher_id', teacherData.teacher_id)
            .order('academic_year', { ascending: false });

          console.log("classesData:", classesData);
          
          if (classesError) {
            throw classesError;
          }
          
          setClasses(classesData || []);
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [router]);

  const handleCreateClass = async (e) => {
    e.preventDefault();
    
    if (!className || !academicYear) {
      setError('กรุณากรอกชื่อชั้นเรียนและปีการศึกษา');
      return;
    }
    
    try {
      setCreating(true);
      setError(null);
      
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          className: className,
          academicYear: academicYear,
          teacherId: teacherId
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการสร้างชั้นเรียน');
      }
      
      // อัปเดตรายการชั้นเรียน
      setClasses(prevClasses => [data.class, ...prevClasses]);
      
      // รีเซ็ตฟอร์ม
      setClassName('');
      setAcademicYear('');
      setCreating(false);
      
      setSuccessMessage('สร้างชั้นเรียนสำเร็จ');
      
      // ซ่อนข้อความสำเร็จหลังจาก 3 วินาที
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error creating class:', error);
      setError(error.message);
      setCreating(false);
    }
  };

  const handleEditClass = async (e) => {
    e.preventDefault();
    
    if (!className || !academicYear) {
      setError('กรุณากรอกชื่อชั้นเรียนและปีการศึกษา');
      return;
    }
    
    try {
      setEditing(true);
      setError(null);
      
      const response = await fetch(`/api/classes/${currentClassId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          className,
          academicYear
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการแก้ไขชั้นเรียน');
      }
      
      // อัปเดตรายการชั้นเรียน
      setClasses(prevClasses => 
        prevClasses.map(cls => 
          cls.class_id === currentClassId ? data.class : cls
        )
      );
      
      // รีเซ็ตฟอร์ม
      setClassName('');
      setAcademicYear('');
      setCurrentClassId(null);
      setEditing(false);
      
      setSuccessMessage('แก้ไขชั้นเรียนสำเร็จ');
      
      // ซ่อนข้อความสำเร็จหลังจาก 3 วินาที
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error editing class:', error);
      setError(error.message);
      setEditing(false);
    }
  };

  const handleDeleteClass = async (classId) => {
    if (!confirm('คุณต้องการลบชั้นเรียนนี้ใช่หรือไม่?')) {
      return;
    }
    
    try {
      setDeleting(true);
      setError(null);
      
      const response = await fetch(`/api/classes/${classId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการลบชั้นเรียน');
      }
      
      // อัปเดตรายการชั้นเรียน
      setClasses(prevClasses => 
        prevClasses.filter(cls => cls.class_id !== classId)
      );
      
      setSuccessMessage('ลบชั้นเรียนสำเร็จ');
      
      // ซ่อนข้อความสำเร็จหลังจาก 3 วินาที
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error deleting class:', error);
      setError(error.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleEditClick = (cls) => {
    setClassName(cls.class_name);
    setAcademicYear(cls.academic_year);
    setCurrentClassId(cls.class_id);
  };

  const handleCancelEdit = () => {
    setClassName('');
    setAcademicYear('');
    setCurrentClassId(null);
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
      <h1 className="text-2xl font-bold mb-6 text-black">จัดการชั้นเรียน</h1>
      
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
      
      {/* ฟอร์มสร้าง/แก้ไขชั้นเรียน */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">
          {currentClassId ? 'แก้ไขชั้นเรียน' : 'สร้างชั้นเรียนใหม่'}
        </h2>
        
        <form onSubmit={currentClassId ? handleEditClass : handleCreateClass} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ชื่อชั้นเรียน
              </label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-black"
                placeholder="เช่น ม.6/1"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ปีการศึกษา
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-black"
                placeholder="เช่น 2566"
                required
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            {currentClassId && (
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
                  {currentClassId ? 'กำลังแก้ไข...' : 'กำลังสร้าง...'}
                </>
              ) : (
                currentClassId ? 'แก้ไขชั้นเรียน' : 'สร้างชั้นเรียน'
              )}
            </button>
          </div>
        </form>
      </div>
      
      {/* รายการชั้นเรียน */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">รายการชั้นเรียนทั้งหมด</h2>
        </div>
        
        {classes.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            ไม่มีรายการชั้นเรียน
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ชื่อชั้นเรียน
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ปีการศึกษา
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classes.map((cls) => (
                  <tr key={cls.class_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {cls.class_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {cls.academic_year}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => router.push(`/dashboard/classes/${cls.class_id}/students`)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          นักเรียน
                        </button>
                        
                        <button
                          onClick={() => router.push(`/dashboard/classes/${cls.class_id}/subjects`)}
                          className="text-green-600 hover:text-green-900"
                        >
                          วิชา
                        </button>
                        
                        <button
                          onClick={() => handleEditClick(cls)}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          แก้ไข
                        </button>
                        
                        <button
                          onClick={() => handleDeleteClass(cls.class_id)}
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