// lib/langchain/llmLogger.js
import { supabase } from '../supabase/client';

export const logLLMUsage = async ({
  operationType,
  inputText,
  outputText,
  processingTime,
  tokenCount,
  assessmentId = null
}) => {
  try {
    const { data, error } = await supabase
      .from('llm_usage_logs')
      .insert({
        operation_type: operationType,
        input_text: inputText,
        output_text: outputText,
        processing_time: processingTime,
        token_count: tokenCount,
        assessment_id: assessmentId
      });
    
    if (error) {
      console.error('Error logging LLM usage:', error);
    }
    
    return data;
  } catch (err) {
    console.error('Error in logLLMUsage:', err);
  }
};

// ฟังก์ชัน Wrapper สำหรับติดตามการใช้งาน LLM
export const trackLLMUsage = async (operationType, assessmentId = null, callback) => {
  const startTime = Date.now();
  let inputText = '';
  let outputText = '';
  let tokenCount = 0;
  
  try {
    const result = await callback((input) => {
      inputText = JSON.stringify(input);
      return input;
    }, (output) => {
      outputText = JSON.stringify(output);
      // ประมาณการใช้ token (ตัวอย่างการคำนวณอย่างง่าย)
      tokenCount = Math.ceil((inputText.length + outputText.length) / 4);
      return output;
    });
    
    const processingTime = (Date.now() - startTime) / 1000; // เวลาที่ใช้เป็นวินาที
    
    // บันทึกการใช้งาน
    await logLLMUsage({
      operationType,
      inputText,
      outputText,
      processingTime,
      tokenCount,
      assessmentId
    });
    
    return result;
  } catch (error) {
    const processingTime = (Date.now() - startTime) / 1000;
    
    // บันทึกข้อผิดพลาด
    await logLLMUsage({
      operationType,
      inputText,
      outputText: `Error: ${error.message}`,
      processingTime,
      tokenCount,
      assessmentId
    });
    
    throw error;
  }
};