// Background script that handles multiple API providers

// Unified API call function
async function callAPI(text, mode, settings = null) {
  const modeInstructions = getModeInstructions(mode);
  const systemPrompt = `You are assistant for rephrasing for a better sentence. You only give the result of the rephrase. ${modeInstructions}`;

  let provider, model, key, url, headers, payload;

  if (settings && !settings.useDefaultApi) {
    // Custom API settings
    ({ provider, model, key } = settings.customApi);
    payload = {
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
      stream: false
    };
  } else {
    // Default Netlify proxy API
    const response = await fetch('https://wordsmith-proxy.netlify.app/.netlify/functions/rephrase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        tone: mode
      })
    });
    
    const data = await response.json();
    if (data.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    }
    throw new Error('No response from proxy API');
  }

  // Only process custom API providers, default is handled above
  if (!settings || settings.useDefaultApi) {
    return; // Default API already handled above
  }

  switch (provider) {
    case 'openai':
      url = 'https://api.openai.com/v1/chat/completions';
      headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` };
      break;

    case 'claude':
      url = 'https://api.anthropic.com/v1/messages';
      headers = { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' };
      payload.model = model;
      payload.max_tokens = 1024;
      payload.messages = payload.messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
      break;

    case 'gemini':
      url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const geminiPayload = {
        contents: [{ parts: [{ text: systemPrompt + '\n\n' + text }] }]
      };
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload)
      });
      const data = await response.json();
      if (data.candidates?.[0]?.content) {
        return data.candidates[0].content.parts[0].text;
      }
      throw new Error('No response from Gemini API');

    case 'deepseek':
      url = 'https://api.deepseek.com/v1/chat/completions';
      headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` };
      break;

    case 'openrouter':
      url = 'https://openrouter.ai/api/v1/chat/completions';
      headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'HTTP-Referer': 'https://wordsmith.ext' };
      break;

    case 'routeway':
      url = 'https://api.routeway.ai/v1/chat/completions';
      headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` };
      break;

    case 'zai':
      url = 'https://api.z.ai/api/paas/v4/chat/completions';
      headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` };
      break;

    default:
      throw new Error(`Unsupported API provider: ${provider}`);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  const data = await response.json();

  if (provider === 'claude') {
    if (data.content?.[0]?.text) {
      return data.content[0].text;
    }
    throw new Error('No response from Claude API');
  } else {
    if (data.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    }
    throw new Error('No response from API');
  }
}

// Function to get mode-specific instructions
function getModeInstructions(mode) {
  const modeInstructions = {
    formal: "Professional, well-structured, business or corporate tone.",
    casual: "Relaxed, everyday conversation style.",
    friendly: "Warm, welcoming, positive, human.",
    concise: "Shorter, sharper, cut to the point.",
    funny: "Playful, humorous phrasing.",
    persuasive: "Strong, convincing, motivational tone.",
    simplified: "Basic vocabulary, easy to understand.",
    academic: "Objective, analytical, research-like tone."
  };
  return modeInstructions[mode] || "Professional, well-structured, business or corporate tone.";
}

// Listen for messages from popup and content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'rephrase') {
    chrome.storage.local.get(['extensionSettings'], async (result) => {
      const settings = result.extensionSettings || { useDefaultApi: true };
      const mode = request.mode || 'formal';

      try {
        const response = await callAPI(request.text, mode, settings);
        sendResponse({ result: response });
      } catch (error) {
        console.error('API error:', error);
        sendResponse({ error: error.message });
      }
    });
    return true; // Keep the message channel open for async response
  }
});