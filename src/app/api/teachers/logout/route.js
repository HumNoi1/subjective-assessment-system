import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(request) {
  try {
    const supabase = await createServerClient();
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ message: 'ออกจากระบบสำเร็จ' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}