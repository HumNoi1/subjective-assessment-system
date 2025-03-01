// src/app/dashboard/layout.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function DashboardLayout({ children }) {
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/login');
          return;
        }
        
        // เปลี่ยนวิธีการดึงข้อมูลอาจารย์
        const { data: teacherData, error } = await supabase
          .from('teachers')
          .select('*')
          .eq('teacher_id', session.user.id)
          .single();
        
        if (error || !teacherData) {
          console.error("Error fetching teacher data:", error);
          router.push('/login');
          return;
        }
        
        setTeacher(teacherData);
        setLoading(false);
        
      } catch (error) {
        console.error('Error checking session:', error);
        router.push('/login');
      }
    };
    
    checkSession();
  }, [router]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-blue-900 text-white transition-all duration-300 ease-in-out`}>
        <div className="flex items-center justify-between p-4 border-b border-blue-800">
          {isSidebarOpen ? (
            <h1 className="text-xl font-bold">ระบบตรวจข้อสอบ</h1>
          ) : (
            <h1 className="text-xl font-bold">รบ.</h1>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1 rounded hover:bg-blue-800"
          >
            {isSidebarOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
        
        <nav className="mt-6">
          <NavLink href="/dashboard" icon="home" label="หน้าหลัก" isExpanded={isSidebarOpen} />
          <NavLink href="/dashboard/classes" icon="users" label="ชั้นเรียน" isExpanded={isSidebarOpen} />
          <NavLink href="/dashboard/subjects" icon="book" label="วิชาเรียน" isExpanded={isSidebarOpen} />
          <NavLink href="/dashboard/terms" icon="calendar" label="เทอมเรียน" isExpanded={isSidebarOpen} />
          <NavLink href="/dashboard/students" icon="user" label="นักเรียน" isExpanded={isSidebarOpen} />
          <NavLink href="/dashboard/answer-keys" icon="key" label="ไฟล์เฉลย" isExpanded={isSidebarOpen} />
          <NavLink href="/dashboard/student-answers" icon="file" label="คำตอบนักเรียน" isExpanded={isSidebarOpen} />
          <NavLink href="/dashboard/assessments" icon="check" label="การประเมิน" isExpanded={isSidebarOpen} />
          <NavLink href="/dashboard/folders" icon="folder" label="โฟลเดอร์" isExpanded={isSidebarOpen} />
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between p-4">
            <h2 className="text-xl font-semibold">ระบบผู้ช่วยตรวจข้อสอบอัตนัย</h2>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium">{teacher?.name}</p>
                <p className="text-xs text-gray-500">{teacher?.email}</p>
              </div>
              
              <button
                onClick={handleLogout}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </header>
        
        {/* Content */}
        <main className="flex-1 overflow-auto bg-gray-100">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavLink({ href, icon, label, isExpanded }) {
  const getIcon = (iconName) => {
    switch (iconName) {
      case 'home':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        );
      case 'users':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case 'book':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case 'calendar':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'user':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'key':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        );
      case 'file':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'check':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      case 'folder':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <Link href={href} className="flex items-center px-4 py-3 text-gray-300 hover:bg-blue-800 transition-colors">
      <div className="flex items-center">
        {getIcon(icon)}
        {isExpanded && <span className="ml-3">{label}</span>}
      </div>
    </Link>
  );
}