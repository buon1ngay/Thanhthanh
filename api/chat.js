const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Xử lý OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Chỉ cho phép POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ chấp nhận POST request' });
  }

  try {
    // Parse request body
    let body;
    
    if (typeof req.body === 'string') {
      try {
        body = JSON.parse(req.body);
      } catch (e) {
        return res.status(400).json({ 
          error: 'Invalid JSON format'
        });
      }
    } else {
      body = req.body;
    }

    // Lấy dữ liệu từ request
    const { prompt, temperature = 0.7, top_p = 0.9 } = body || {};

    // Kiểm tra prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return res.status(400).json({ 
        error: 'Prompt không hợp lệ'
      });
    }

    // Lấy API key
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: 'API key chưa được cấu hình'
      });
    }

    // Gọi Gemini API với model ĐÚNG
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const geminiResponse = await fetch(geminiUrl, {
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
          temperature: parseFloat(temperature),
          topP: parseFloat(top_p),
          maxOutputTokens: 8192,
        }
      })
    });

    const geminiData = await geminiResponse.json();

    // Kiểm tra lỗi từ Gemini
    if (geminiData.error) {
      console.error('Gemini API Error:', geminiData.error);
      return res.status(500).json({ 
        error: 'Lỗi từ Gemini API',
        details: geminiData.error.message
      });
    }

    // Chuyển đổi format về giống OpenAI
    if (geminiData.candidates && geminiData.candidates[0]) {
      const content = geminiData.candidates[0].content?.parts?.[0]?.text;
      
      if (!content) {
        return res.status(500).json({ 
          error: 'Không nhận được nội dung từ AI' 
        });
      }

      const aiResponse = {
        choices: [{
          message: {
            content: content
          },
          finish_reason: 'stop',
          index: 0
        }],
        model: 'gemini-2.5-flash',
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
