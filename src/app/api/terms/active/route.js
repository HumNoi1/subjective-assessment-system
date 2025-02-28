import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// ดึงเทอมเรียนที่กำลังใช้งานอยู่
export async function GET() {
  try {
    const supabase = await createServerClient();
    
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('terms')
      .select('*')
      .lte('start_date', today)
      .gte('end_date', today)
      .order('start_date', { ascending: false });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ terms: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}