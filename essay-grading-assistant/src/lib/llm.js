// File: lib/llm.js
import axios from 'axios';

const LMSTUDIO_ENDPOINT = process.env.LMSTUDIO_ENDPOINT || 'http://localhost:8000/v1/chat/completions';
const LMSTUDIO_API_KEY = process.env.LMSTUDIO_API_KEY || 'lm-studio';

export async function generateResponse(messages, temperature = 0.7, maxTokens = 1024) {
  try {
    const response = await axios.post(
      LMSTUDIO_ENDPOINT,
      {
        model: 'llama-model', // ปรับตามโมเดลที่ใช้ใน LMStudio
        messages,
        temperature,
        max_tokens: maxTokens,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LMSTUDIO_API_KEY}`,
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating LLM response:', error);
    throw error;
  }
}