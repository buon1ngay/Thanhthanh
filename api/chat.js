const fetch = require('node-fetch');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ chấp nhận POST request' });
  }

  try {
    let body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    // HỖ TRỢ CẢ FORMAT CŨ (prompt) VÀ MỚI (messages)
    const { 
      prompt,           // Format cũ (1 câu)
      messages,         // Format mới (lịch sử)
      temperature = 0.7, 
      top_p = 0.9 
    } = body || {};

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'API key chưa được cấu hình' });
    }

    // CHUYỂN ĐỔI FORMAT
    let geminiContents = [];
    
    if (messages && Array.isArray(messages)) {
      // Format mới: có lịch sử
      for (const msg of messages) {
        geminiContents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    } else if (prompt) {
      // Format cũ: chỉ 1 câu
      geminiContents.push({
        role: 'user',
        parts: [{ text: prompt }]
      });
    } else {
      return res.status(400).json({ error: 'Thiếu prompt hoặc messages' });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: geminiContents,
        generationConfig: {
          temperature: parseFloat(temperature),
          topP: parseFloat(top_p),
          maxOutputTokens: 8192,
        }
      })
    });

    const geminiData = await geminiResponse.json();

    if (geminiData.error) {
      console.error('Gemini API Error:', geminiData.error);
      return res.status(500).json({ 
        error: 'Lỗi từ Gemini API',
        details: geminiData.error.message
      });
    }

    if (geminiData.candidates && geminiData.candidates[0]) {
      const content = geminiData.candidates[0].content?.parts?.[0]?.text;
      
      if (!content) {
        return res.status(500).json({ error: 'Không nhận được nội dung từ AI' });
      }

      // TRẢ VỀ FORMAT OPENAI (tương thích code Android)
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
      return res.status(500).json({ error: 'Không nhận được phản hồi từ AI' });
    }

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ 
      error: 'Lỗi server',
      details: error.message
    });
  }
};
