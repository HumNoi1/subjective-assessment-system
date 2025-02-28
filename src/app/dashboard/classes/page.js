// app/dashboard/classes/page.js
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase/client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const classSchema = z.object({
  className: z.string().min(1, 'กรุณาระบุชื่อชั้นเรียน'),
  academicYear: z.string().min(1, 'กรุณาระบุปีการศึกษา'),
});

export default function ClassManagementPage() {
  const { data: session } = useSession();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(classSchema),
  });
  
  useEffect(() => {
    if (session?.user?.id) {
      fetchClasses();
    }
  }, [session]);
  
  const fetchClasses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('classes')
        .select('*, students:students(count)')
        .eq('teacher_id', session.user.id);
      
      if (error) throw error;
      
      setClasses(data);
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError('ไม่สามารถดึงข้อมูลชั้นเรียนได้');
    } finally {
      setLoading(false);
    }
  };
  
  const onSubmit = async (data) => {
    try {
      const { data: newClass, error } = await supabase
        .from('classes')
        .insert({
          class_name: data.className,
          academic_year: data.academicYear,
          teacher_id: session.user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setClasses(prevClasses => [...prevClasses, { ...newClass, students: { count: 0 } }]);
      reset();
      setIsAdding(false);
    } catch (err) {
      console.error('Error adding class:', err);
      setError('ไม่สามารถเพิ่มชั้นเรียนได้');
    }
  };
  
  if (loading) {
    return <div className="flex justify-center items-center min-h-[50vh]">กำลังโหลด...</div>;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">จัดการชั้นเรียน</h1>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          เพิ่มชั้นเรียนใหม่
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 p-4 rounded-md text-red-700 mb-6">
          {error}
        </div>
      )}
      
      {isAdding && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">เพิ่มชั้นเรียนใหม่</h2>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อชั้นเรียน
                </label>
                <input
                  type="text"
                  {...register('className')}
                  className="w-full border-gray-300 rounded-md shadow-sm"
                />
                {errors.className && (
                  <p className="mt-1 text-sm text-red-600">{errors.className.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ปีการศึกษา
                </label>
                <input
                  type="text"
                  {...register('academicYear')}
                  className="w-full border-gray-300 rounded-md shadow-sm"
                />
                {errors.academicYear && (
                  <p className="mt-1 text-sm text-red-600">{errors.academicYear.message}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  reset();
                  setIsAdding(false);
                }}
                className="border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                บันทึก
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
                จำนวนนักเรียน
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                การจัดการ
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {classes.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                  ยังไม่มีชั้นเรียน กรุณาเพิ่มชั้นเรียนใหม่
                </td>
              </tr>
            ) : (
              classes.map((cls) => (
                <tr key={cls.class_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {cls.class_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cls.academic_year}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cls.students?.count || 0} คน
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      className="text-blue-600 hover:text-blue-800 mr-3"
                      onClick={() => {/* ไปยังหน้ารายละเอียดชั้นเรียน */}}
                    >
                      รายละเอียด
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800"
                      onClick={async () => {/* ลบชั้นเรียน */}}
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}