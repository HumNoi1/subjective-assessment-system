// src/app/api/llm/usage-logs/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const operationType = searchParams.get('operationType');
    const assessmentId = searchParams.get('assessmentId');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const supabase = await createServerClient();
    
    let query = supabase
      .from('llm_usage_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (operationType) {
      query = query.eq('operation_type', operationType);
    }
    
    if (assessmentId) {
      query = query.eq('assessment_id', assessmentId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    // คำนวณสถิติการใช้งาน
    const totalProcessingTime = data.reduce((sum, log) => sum + log.processing_time, 0);
    const totalTokens = data.reduce((sum, log) => sum + log.token_count, 0);
    const averageProcessingTime = data.length > 0 ? totalProcessingTime / data.length : 0;
    
    // แยกตามประเภทการใช้งาน
    const operationCounts = data.reduce((counts, log) => {
      counts[log.operation_type] = (counts[log.operation_type] || 0) + 1;
      return counts;
    }, {});
    
    return NextResponse.json({
      logs: data,
      stats: {
        totalLogs: data.length,
        totalProcessingTime,
        totalTokens,
        averageProcessingTime,
        operationCounts
      }
    });
    
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}