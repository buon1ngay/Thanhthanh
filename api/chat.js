const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // Chỉ cho phép POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ chấp nhận POST request' });
  }

  // Cho phép CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Xử lý OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Lấy dữ liệu từ request
    const { prompt, temperature = 0.2, top_p = 0.2, n = 1 } = req.body;

    // Kiểm tra prompt
    if (!prompt || prompt.trim() === '') {
      return res.status(400).json({ 
        error: 'Prompt không được để trống' 
      });
    }

    // Lấy API key từ biến môi trường
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: 'API key chưa được cấu hình' 
      });
    }

    // Gọi API Google Gemini
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: temperature,
            topP: top_p,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    const data = await response.json();

    // Kiểm tra lỗi từ Gemini
    if (data.error) {
      console.error('Gemini API Error:', data.error);
      return res.status(500).json({ 
        error: 'Lỗi từ Gemini API',
        details: data.error.message 
      });
    }

    // Chuyển đổi format về giống OpenAI
    if (data.candidates && data.candidates[0]) {
      const aiResponse = {
        choices: [{
          message: {
            content: data.candidates[0].content.parts[0].text
          },
          finish_reason: 'stop',
          index: 0
        }],
        model: 'gemini-pro',
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      };
      
      return res.status(200).json(aiResponse);
    } else {
      return res.status(500).json({ 
        error: 'Không nhận được phản hồi từ AI' 
      });
    }

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ 
      error: 'Lỗi server',
      details: error.message 
    });
  }
};
