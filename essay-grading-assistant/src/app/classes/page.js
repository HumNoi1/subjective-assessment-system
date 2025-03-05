// File: app/classes/page.js
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import AppLayout from '@/components/AppLayout'
import Card from '@/components/Card'
import { supabase } from '@/lib/supabase'

export default function Classes() {
  const { user } = useAuth()
  const [classes, setClasses] = useState([])
  const [semesters, setSemesters] = useState([])
  const [loading, setLoading] = useState(true)
  const [newClass, setNewClass] = useState({ name: '', semester_id: '' })
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // ดึงข้อมูลเทอมเรียน
      const { data: semestersData, error: semestersError } = await supabase
        .from('semesters')
        .select('*')
        .eq('teacher_id', user.id)
        .order('year', { ascending: false })
        .order('name', { ascending: false })

      if (semestersError) throw semestersError
      setSemesters(semestersData || [])
      
      // ดึงข้อมูลชั้นเรียนพร้อมข้อมูลเทอม
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select(`
          *,
          semesters:semesters(id, name, year)
        `)
        .eq('teacher_id', user.id)
        .order('name')

      if (classesError) throw classesError
      setClasses(classesData || [])
      
      // ตั้งค่า default semester_id ถ้ามีเทอมในระบบ
      if (semestersData && semestersData.length > 0) {
        setNewClass(prev => ({ ...prev, semester_id: semestersData[0].id }))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('ไม่สามารถดึงข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  const handleAddClass = async (e) => {
    e.preventDefault()
    try {
      setIsAdding(true)
      setError(null)
      
      // ตรวจสอบว่ามีข้อมูลครบถ้วน
      if (!newClass.name || !newClass.semester_id) {
        throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน')
      }
      
      const { data, error } = await supabase
        .from('classes')
        .insert([{
          teacher_id: user.id,
          name: newClass.name,
          semester_id: newClass.semester_id
        }])
        .select(`
          *,
          semesters (id, name, year)
        `)

      if (error) throw error
      
      setClasses([...classes, data[0]])
      setNewClass({ name: '', semester_id: newClass.semester_id })
    } catch (error) {
      console.error('Error adding class:', error)
      setError(error.message)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteClass = async (id) => {
    if (!confirm('คุณต้องการลบชั้นเรียนนี้ใช่หรือไม่? การลบชั้นเรียนจะทำให้ข้อมูลที่เกี่ยวข้องถูกลบด้วย')) {
      return
    }
    
    try {
      setLoading(true)
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setClasses(classes.filter(cls => cls.id !== id))
    } catch (error) {
      console.error('Error deleting class:', error)
      setError('ไม่สามารถลบชั้นเรียนได้')
    } finally {
      setLoading(false)
    }
  }

  const getSemesterName = (semester) => {
    if (!semester) return '-'
    return `เทอม ${semester.name}/${semester.year}`
  }

  return (
    <AppLayout>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ชั้นเรียน</h1>
          <p className="text-gray-500">จัดการข้อมูลชั้นเรียนทั้งหมด</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form เพิ่มชั้นเรียนใหม่ */}
        <Card title="เพิ่มชั้นเรียนใหม่">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
              {error}
            </div>
          )}

          {semesters.length === 0 ? (
            <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded">
              กรุณาเพิ่มเทอมเรียนก่อนเพิ่มชั้นเรียน
            </div>
          ) : (
            <form onSubmit={handleAddClass}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อชั้นเรียน
                </label>
                <input
                  type="text"
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="เช่น 6/1, ป.6/2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  เทอมเรียน
                </label>
                <select
                  value={newClass.semester_id}
                  onChange={(e) => setNewClass({ ...newClass, semester_id: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                >
                  <option value="">เลือกเทอมเรียน</option>
                  {semesters.map((semester) => (
                    <option key={semester.id} value={semester.id}>
                      เทอม {semester.name}/{semester.year}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={isAdding}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
              >
                {isAdding ? 'กำลังเพิ่ม...' : 'เพิ่มชั้นเรียน'}
              </button>
            </form>
          )}
        </Card>
        
        {/* แสดงรายการชั้นเรียน */}
        <div className="md:col-span-2">
          <Card title="รายการชั้นเรียน">
            {loading ? (
              <div className="text-center py-4">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
              </div>
            ) : classes.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500">ยังไม่มีชั้นเรียนในระบบ</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-2 font-medium">ชื่อชั้นเรียน</th>
                      <th className="pb-2 font-medium">เทอมเรียน</th>
                      <th className="pb-2 font-medium">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {classes.map((classItem) => (
                      <tr key={classItem.id} className="hover:bg-gray-50">
                        <td className="py-3">{classItem.name}</td>
                        <td className="py-3">{getSemesterName(classItem.semesters)}</td>
                        <td className="py-3">
                          <button
                            onClick={() => handleDeleteClass(classItem.id)}
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