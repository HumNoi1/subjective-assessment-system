// src/app/dashboard/terms/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function TermsPage() {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [termName, setTermName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentTermId, setCurrentTermId] = useState(null);
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
        
        // ดึงข้อมูลเทอมเรียน
        const { data: termsData, error: termsError } = await supabase
          .from('terms')
          .select('*')
          .order('start_date', { ascending: false });
        
        if (termsError) {
          throw termsError;
        }
        
        setTerms(termsData || []);
      } catch (error) {
        console.error('Error fetching terms:', error);
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [router]);

  const handleCreateTerm = async (e) => {
    e.preventDefault();
    
    if (!termName || !startDate || !endDate) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    
    if (new Date(endDate) <= new Date(startDate)) {
      setError('วันที่สิ้นสุดต้องมากกว่าวันที่เริ่มต้น');
      return;
    }
    
    try {
      setCreating(true);
      setError(null);
      
      const response = await fetch('/api/terms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          termName,
          startDate,
          endDate
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการสร้างเทอมเรียน');
      }
      
      // อัปเดตรายการเทอมเรียน
      setTerms(prevTerms => [data.term, ...prevTerms]);
      
      // รีเซ็ตฟอร์ม
      setTermName('');
      setStartDate('');
      setEndDate('');
      
      setSuccessMessage('สร้างเทอมเรียนสำเร็จ');
      
      // ซ่อนข้อความสำเร็จหลังจาก 3 วินาที
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error creating term:', error);
      setError(error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleEditTerm = async (e) => {
    e.preventDefault();
    
    if (!termName || !startDate || !endDate) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    
    if (new Date(endDate) <= new Date(startDate)) {
      setError('วันที่สิ้นสุดต้องมากกว่าวันที่เริ่มต้น');
      return;
    }
    
    try {
      setEditing(true);
      setError(null);
      
      const response = await fetch(`/api/terms/${currentTermId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          termName,
          startDate,
          endDate
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการแก้ไขเทอมเรียน');
      }
      
      // อัปเดตรายการเทอมเรียน
      setTerms(prevTerms => 
        prevTerms.map(term => 
          term.term_id === currentTermId ? data.term : term
        )
      );
      
      // รีเซ็ตฟอร์ม
      setTermName('');
      setStartDate('');
      setEndDate('');
      setCurrentTermId(null);
      
      setSuccessMessage('แก้ไขเทอมเรียนสำเร็จ');
      
      // ซ่อนข้อความสำเร็จหลังจาก 3 วินาที
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error editing term:', error);
      setError(error.message);
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteTerm = async (termId) => {
    if (!confirm('คุณต้องการลบเทอมเรียนนี้ใช่หรือไม่?')) {
      return;
    }
    
    try {
      setDeleting(true);
      setError(null);
      
      const response = await fetch(`/api/terms/${termId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการลบเทอมเรียน');
      }
      
      // อัปเดตรายการเทอมเรียน
      setTerms(prevTerms => 
        prevTerms.filter(term => term.term_id !== termId)
      );
      
      setSuccessMessage('ลบเทอมเรียนสำเร็จ');
      
      // ซ่อนข้อความสำเร็จหลังจาก 3 วินาที
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error deleting term:', error);
      setError(error.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleEditClick = (term) => {
    setTermName(term.term_name);
    setStartDate(term.start_date);
    setEndDate(term.end_date);
    setCurrentTermId(term.term_id);
  };

  const handleCancelEdit = () => {
    setTermName('');
    setStartDate('');
    setEndDate('');
    setCurrentTermId(null);
  };

  // ตรวจสอบว่าเทอมไหนกำลังใช้งานอยู่
  const isActiveTerm = (term) => {
    const today = new Date();
    const startDate = new Date(term.start_date);
    const endDate = new Date(term.end_date);
    
    return today >= startDate && today <= endDate;
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
      <h1 className="text-2xl font-bold mb-6">จัดการเทอมเรียน</h1>
      
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
      
      {/* ฟอร์มสร้าง/แก้ไขเทอมเรียน */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">
          {currentTermId ? 'แก้ไขเทอมเรียน' : 'สร้างเทอมเรียนใหม่'}
        </h2>
        
        <form onSubmit={currentTermId ? handleEditTerm : handleCreateTerm} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ชื่อเทอม
              </label>
              <input
                type="text"
                value={termName}
                onChange={(e) => setTermName(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="เช่น ภาคเรียนที่ 1/2566"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                วันที่เริ่มต้น
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                วันที่สิ้นสุด
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            {currentTermId && (
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
                  {currentTermId ? 'กำลังแก้ไข...' : 'กำลังสร้าง...'}
                </>
              ) : (
                currentTermId ? 'แก้ไขเทอมเรียน' : 'สร้างเทอมเรียน'
              )}
            </button>
          </div>
        </form>
      </div>
      
      {/* รายการเทอมเรียน */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">รายการเทอมเรียนทั้งหมด</h2>
        </div>
        
        {terms.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            ไม่มีรายการเทอมเรียน
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ชื่อเทอม
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วันที่เริ่มต้น
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วันที่สิ้นสุด
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    สถานะ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {terms.map((term) => (
                  <tr key={term.term_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {term.term_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(term.start_date).toLocaleDateString('th-TH')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(term.end_date).toLocaleDateString('th-TH')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        isActiveTerm(term) 
                          ? 'bg-green-100 text-green-800' 
                          : new Date(term.start_date) > new Date()
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {isActiveTerm(term) 
                          ? 'กำลังใช้งาน' 
                          : new Date(term.start_date) > new Date()
                            ? 'กำลังจะมาถึง'
                            : 'สิ้นสุดแล้ว'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => router.push(`/dashboard/terms/${term.term_id}/answer-keys`)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          ไฟล์เฉลย
                        </button>
                        
                        <button
                          onClick={() => handleEditClick(term)}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          แก้ไข
                        </button>
                        
                        <button
                          onClick={() => handleDeleteTerm(term.term_id)}
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