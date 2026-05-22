require('dotenv').config();
const fetch = require('node-fetch');

async function testVLM() {
  const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  
  console.log('Sending base64 image + strict system instructions to NVIDIA VLM...');
  
  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta/llama-3.2-11b-vision-instruct',
        messages: [
          {
            role: 'system',
            content: 'You are an expert clinical AI radiologist. You must output strictly valid JSON, and nothing else. No conversational text, no markdown backticks, no introduction, and no bullet points. Begin your response directly with the opening curly brace "{" and end with "}".'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this scan (Type: CT, Body Part: Brain). Return a JSON object of this structure: {"status": "healthy"|"abnormal", "primaryDiagnosis": "None"|"disease name", "severity": "normal"|"mild"|"moderate"|"severe", "confidence": 0.95, "description": "detailed clinical summary"}'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 500
      })
    });

    console.log('Status Code:', response.status);
    const result = await response.json();
    console.log('Response Content:', JSON.stringify(result, null, 2));
    
    const content = result.choices[0].message.content;
    console.log('\n--- PARSED TEXT CONTENT ---');
    console.log(content);
    
    try {
      const parsed = JSON.parse(content.trim().replace(/^```json\s*/, '').replace(/```$/, ''));
      console.log('\n✅ SUCCESSFULLY PARSED JSON:', parsed);
    } catch (e) {
      console.error('\n❌ FAILED TO PARSE JSON:', e.message);
    }
    
  } catch (err) {
    console.error('Error during VLM call:', err);
  }
}

testVLM();
