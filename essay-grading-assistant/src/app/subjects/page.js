// File: app/subjects/page.js
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import AppLayout from '@/components/AppLayout'
import Card from '@/components/Card'
import { supabase } from '@/lib/supabase'

export default function Subjects() {
  const { user } = useAuth()
  const [subjects, setSubjects] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [newSubject, setNewSubject] = useState({ name: '', class_id: '' })
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
      
      // ดึงข้อมูลชั้นเรียน
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select(`
          id, 
          name,
          semesters (id, name, year)
        `)
        .eq('teacher_id', user.id)
        .order('name')

      if (classesError) throw classesError
      setClasses(classesData || [])
      
      // ดึงข้อมูลวิชาเรียนพร้อมข้อมูลชั้นเรียน
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select(`
          *,
          classes (id, name),
          classes.semesters (id, name, year)
        `)
        .eq('teacher_id', user.id)
        .order('name')

      if (subjectsError) throw subjectsError
      setSubjects(subjectsData || [])
      
      // ตั้งค่า default class_id ถ้ามีชั้นเรียนในระบบ
      if (classesData && classesData.length > 0) {
        setNewSubject(prev => ({ ...prev, class_id: classesData[0].id }))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('ไม่สามารถดึงข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  const handleAddSubject = async (e) => {
    e.preventDefault()
    try {
      setIsAdding(true)
      setError(null)
      
      // ตรวจสอบว่ามีข้อมูลครบถ้วน
      if (!newSubject.name || !newSubject.class_id) {
        throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน')
      }
      
      const { data, error } = await supabase
        .from('subjects')
        .insert([{
          teacher_id: user.id,
          name: newSubject.name,
          class_id: newSubject.class_id
        }])
        .select(`
          *,
          classes (id, name),
          classes.semesters (id, name, year)
        `)

      if (error) throw error
      
      setSubjects([...subjects, data[0]])
      setNewSubject({ name: '', class_id: newSubject.class_id })
    } catch (error) {
      console.error('Error adding subject:', error)
      setError(error.message)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteSubject = async (id) => {
    if (!confirm('คุณต้องการลบวิชาเรียนนี้ใช่หรือไม่? การลบวิชาเรียนจะทำให้ข้อมูลที่เกี่ยวข้องถูกลบด้วย')) {
      return
    }
    
    try {
      setLoading(true)
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setSubjects(subjects.filter(subj => subj.id !== id))
    } catch (error) {
      console.error('Error deleting subject:', error)
      setError('ไม่สามารถลบวิชาเรียนได้')
    } finally {
      setLoading(false)
    }
  }

  // ฟังก์ชันรวมชื่อเทอมและชั้นเรียนเข้าด้วยกัน
  const getClassFullName = (classItem) => {
    if (!classItem || !classItem.name) return '-'
    
    const semester = classItem.semesters
    if (!semester) return `${classItem.name}`
    
    return `${classItem.name} (เทอม ${semester.name}/${semester.year})`
  }

  return (
    <AppLayout>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">วิชาเรียน</h1>
          <p className="text-gray-500">จัดการข้อมูลวิชาเรียนทั้งหมด</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-black">
        {/* Form เพิ่มวิชาเรียนใหม่ */}
        <Card title="เพิ่มวิชาเรียนใหม่">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
              {error}
            </div>
          )}

          {classes.length === 0 ? (
            <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded">
              กรุณาเพิ่มชั้นเรียนก่อนเพิ่มวิชาเรียน
            </div>
          ) : (
            <form onSubmit={handleAddSubject}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อวิชา
                </label>
                <input
                  type="text"
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="เช่น คณิตศาสตร์, วิทยาศาสตร์"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชั้นเรียน
                </label>
                <select
                  value={newSubject.class_id}
                  onChange={(e) => setNewSubject({ ...newSubject, class_id: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                >
                  <option value="">เลือกชั้นเรียน</option>
                  {classes.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {getClassFullName(classItem)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={isAdding}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
              >
                {isAdding ? 'กำลังเพิ่ม...' : 'เพิ่มวิชาเรียน'}
              </button>
            </form>
          )}
        </Card>
        
        {/* แสดงรายการวิชาเรียน */}
        <div className="md:col-span-2">
          <Card title="รายการวิชาเรียน">
            {loading ? (
              <div className="text-center py-4">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
              </div>
            ) : subjects.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500">ยังไม่มีวิชาเรียนในระบบ</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-2 font-medium">ชื่อวิชา</th>
                      <th className="pb-2 font-medium">ชั้นเรียน</th>
                      <th className="pb-2 font-medium">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {subjects.map((subject) => (
                      <tr key={subject.id} className="hover:bg-gray-50">
                        <td className="py-3">{subject.name}</td>
                        <td className="py-3">{getClassFullName(subject.classes)}</td>
                        <td className="py-3">
                          <button
                            onClick={() => handleDeleteSubject(subject.id)}
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