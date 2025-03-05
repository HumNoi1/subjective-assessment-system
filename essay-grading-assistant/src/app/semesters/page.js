// File: app/semesters/page.js
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import AppLayout from '@/components/AppLayout'
import Card from '@/components/Card'
import { supabase } from '@/lib/supabase'

export default function Semesters() {
  const { user } = useAuth()
  const [semesters, setSemesters] = useState([])
  const [loading, setLoading] = useState(true)
  const [newSemester, setNewSemester] = useState({ name: '', year: new Date().getFullYear() })
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user) {
      fetchSemesters()
    }
  }, [user])

  const fetchSemesters = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('semesters')
        .select('*')
        .eq('teacher_id', user.id)
        .order('year', { ascending: false })
        .order('name', { ascending: false })

      if (error) throw error
      setSemesters(data || [])
    } catch (error) {
      console.error('Error fetching semesters:', error)
      setError('ไม่สามารถดึงข้อมูลเทอมได้')
    } finally {
      setLoading(false)
    }
  }

  const handleAddSemester = async (e) => {
    e.preventDefault()
    try {
      setIsAdding(true)
      setError(null)
      
      // ตรวจสอบว่ามีข้อมูลครบถ้วน
      if (!newSemester.name || !newSemester.year) {
        throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน')
      }
      
      const { data, error } = await supabase
        .from('semesters')
        .insert([{
          teacher_id: user.id,
          name: newSemester.name,
          year: newSemester.year
        }])
        .select()

      if (error) throw error
      
      setSemesters([...semesters, data[0]])
      setNewSemester({ name: '', year: new Date().getFullYear() })
    } catch (error) {
      console.error('Error adding semester:', error)
      setError(error.message)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteSemester = async (id) => {
    if (!confirm('คุณต้องการลบเทอมนี้ใช่หรือไม่? การลบเทอมจะทำให้ข้อมูลที่เกี่ยวข้องถูกลบด้วย')) {
      return
    }
    
    try {
      setLoading(true)
      const { error } = await supabase
        .from('semesters')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setSemesters(semesters.filter(sem => sem.id !== id))
    } catch (error) {
      console.error('Error deleting semester:', error)
      setError('ไม่สามารถลบเทอมได้')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">เทอมเรียน</h1>
          <p className="text-gray-500">จัดการข้อมูลเทอมเรียนทั้งหมด</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-black">
        {/* Form เพิ่มเทอมเรียนใหม่ */}
        <Card title="เพิ่มเทอมเรียนใหม่">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
              {error}
            </div>
          )}
          <form onSubmit={handleAddSemester}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ชื่อเทอม
              </label>
              <input
                type="text"
                value={newSemester.name}
                onChange={(e) => setNewSemester({ ...newSemester, name: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="เช่น 1, 2, ฤดูร้อน"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ปีการศึกษา
              </label>
              <input
                type="number"
                value={newSemester.year}
                onChange={(e) => setNewSemester({ ...newSemester, year: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="เช่น 2567"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isAdding}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              {isAdding ? 'กำลังเพิ่ม...' : 'เพิ่มเทอมเรียน'}
            </button>
          </form>
        </Card>
        
        {/* แสดงรายการเทอมเรียน */}
        <div className="md:col-span-2">
          <Card title="รายการเทอมเรียน">
            {loading ? (
              <div className="text-center py-4">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
              </div>
            ) : semesters.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500">ยังไม่มีเทอมเรียนในระบบ</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-2 font-medium">ชื่อเทอม</th>
                      <th className="pb-2 font-medium">ปีการศึกษา</th>
                      <th className="pb-2 font-medium">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {semesters.map((semester) => (
                      <tr key={semester.id} className="hover:bg-gray-50">
                        <td className="py-3">{semester.name}</td>
                        <td className="py-3">{semester.year}</td>
                        <td className="py-3">
                          <button
                            onClick={() => handleDeleteSemester(semester.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            ลบ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}