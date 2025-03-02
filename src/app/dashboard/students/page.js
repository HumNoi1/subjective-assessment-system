'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [teacherId, setTeacherId] = useState(null);
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [currentStudentId, setCurrentStudentId] = useState(null);
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
          
          // ดึงข้อมูลชั้นเรียนที่อาจารย์รับผิดชอบ
          const { data: classesData } = await supabase
            .from('classes')
            .select('*')
            .eq('teacher_id', teacherData.teacher_id)
            .order('academic_year', { ascending: false });
          
          setClasses(classesData || []);
          
          // ดึงข้อมูลนักเรียนในชั้นเรียนที่อาจารย์รับผิดชอบ
          const { data: studentsData } = await supabase
            .from('students')
            .select('*, classes(class_name, academic_year)')
            .in('class_id', classesData?.map(cls => cls.class_id) || []);
          
          setStudents(studentsData || []);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [router]);

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    
    if (!studentName || !studentEmail || !selectedClass) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    
    try {
      setCreating(true);
      setError(null);
      
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: studentName,
          email: studentEmail,
          classId: selectedClass
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการเพิ่มนักเรียน');
      }
      
      // หาชั้นเรียนของนักเรียน
      const classInfo = classes.find(cls => cls.class_id.toString() === selectedClass);
      
      // อัปเดตรายการนักเรียน
      setStudents(prevStudents => [
        {
          ...data.student,
          classes: {
            class_name: classInfo?.class_name,
            academic_year: classInfo?.academic_year
          }
        },
        ...prevStudents
      ]);
      
      // รีเซ็ตฟอร์ม
      setStudentName('');
      setStudentEmail('');
      setSelectedClass('');
      
      setSuccessMessage('เพิ่มนักเรียนสำเร็จ');
      
      // ซ่อนข้อความสำเร็จหลังจาก 3 วินาที
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error creating student:', error);
      setError(error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleEditStudent = async (e) => {
    e.preventDefault();
    
    if (!studentName || !studentEmail || !selectedClass) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    
    try {
      setEditing(true);
      setError(null);
      
      const response = await fetch(`/api/students/${currentStudentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: studentName,
          email: studentEmail,
          classId: selectedClass
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลนักเรียน');
      }
      
      // หาชั้นเรียนของนักเรียน
      const classInfo = classes.find(cls => cls.class_id.toString() === selectedClass);
      
      // อัปเดตรายการนักเรียน
      setStudents(prevStudents => 
        prevStudents.map(student => 
          student.student_id === currentStudentId 
            ? {
                ...data.student,
                classes: {
                  class_name: classInfo?.class_name,
                  academic_year: classInfo?.academic_year
                }
              } 
            : student
        )
      );
      
      // รีเซ็ตฟอร์ม
      setStudentName('');
      setStudentEmail('');
      setSelectedClass('');
      setCurrentStudentId(null);
      
      setSuccessMessage('แก้ไขข้อมูลนักเรียนสำเร็จ');
      
      // ซ่อนข้อความสำเร็จหลังจาก 3 วินาที
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error editing student:', error);
      setError(error.message);
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!confirm('คุณต้องการลบข้อมูลนักเรียนนี้ใช่หรือไม่?')) {
      return;
    }
    
    try {
      setDeleting(true);
      setError(null);
      
      const response = await fetch(`/api/students/${studentId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการลบข้อมูลนักเรียน');
      }
      
      // อัปเดตรายการนักเรียน
      setStudents(prevStudents => 
        prevStudents.filter(student => student.student_id !== studentId)
      );
      
      setSuccessMessage('ลบข้อมูลนักเรียนสำเร็จ');
      
      // ซ่อนข้อความสำเร็จหลังจาก 3 วินาที
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error deleting student:', error);
      setError(error.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleEditClick = (student) => {
    setStudentName(student.name);
    setStudentEmail(student.email);
    setSelectedClass(student.class_id.toString());
    setCurrentStudentId(student.student_id);
  };

  const handleCancelEdit = () => {
    setStudentName('');
    setStudentEmail('');
    setSelectedClass('');
    setCurrentStudentId(null);
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
      <h1 className="text-2xl font-bold mb-6 text-black">จัดการข้อมูลนักเรียน</h1>
      
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
      
      {/* ฟอร์มเพิ่ม/แก้ไขนักเรียน */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4 text-black">
          {currentStudentId ? 'แก้ไขข้อมูลนักเรียน' : 'เพิ่มนักเรียนใหม่'}
        </h2>
        
        <form onSubmit={currentStudentId ? handleEditStudent : handleCreateStudent} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ชื่อ-นามสกุล
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-black"
                placeholder="ชื่อ-นามสกุลนักเรียน"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                อีเมล
              </label>
              <input
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-black"
                placeholder="อีเมลนักเรียน"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ชั้นเรียน
              </label>
              <select
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-black"
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
            {currentStudentId && (
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
                  {currentStudentId ? 'กำลังแก้ไข...' : 'กำลังเพิ่ม...'}
                </>
              ) : (
                currentStudentId ? 'แก้ไขข้อมูลนักเรียน' : 'เพิ่มนักเรียน'
              )}
            </button>
          </div>
        </form>
      </div>
      
      {/* รายการนักเรียน */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-black">รายชื่อนักเรียนทั้งหมด</h2>
        </div>
        
        {students.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            ไม่มีรายชื่อนักเรียน
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ชื่อ-นามสกุล
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    อีเมล
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
                {students.map((student) => (
                  <tr key={student.student_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {student.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {student.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {student.classes?.class_name} ({student.classes?.academic_year})
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => router.push(`/dashboard/students/${student.student_id}/answers`)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          คำตอบ
                        </button>
                        
                        <button
                          onClick={() => router.push(`/dashboard/students/${student.student_id}/assessments`)}
                          className="text-green-600 hover:text-green-900"
                        >
                          การประเมิน
                        </button>
                        
                        <button
                          onClick={() => handleEditClick(student)}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          แก้ไข
                        </button>
                        
                        <button
                          onClick={() => handleDeleteStudent(student.student_id)}
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