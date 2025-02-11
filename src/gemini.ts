const API_END_POINT: string =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite-preview-02-05:generateContent';

const getGeminiApiKey = async (): Promise<string> => {
  const result = await chrome.storage.sync.get(['geminiApiKey']);
  if (!result.geminiApiKey) {
    throw new Error('Gemini API key is not set. Please configure it in the extension settings.');
  }
  return result.geminiApiKey;
};

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export const askGemini = async (prompt: string): Promise<GeminiResponse | null> => {
  console.log('🎯 Calling Gemini API with prompt:', prompt);

  try {
    const apiKey = await getGeminiApiKey();
    const response = await fetch(
      `${API_END_POINT}?key=${apiKey}`,
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
          }]
        })
      });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Gemini API Response:', result);
    return result;
  } catch (error) {
    console.error('❌ Gemini API Error:', error);
    throw error;
  }
};

export const fetchMusicOrNot = async (title: string): Promise<boolean> => {
  console.log('📝 Checking if video is music:', title);

  const prompt = `
You are a video content profiling expert. Analyze the given YouTube video title and determine if it's music content.

Please respond with "true" for:
- Official/unofficial music videos
- Lyric videos
- Live performances
- Music-related documentaries or interviews
- Cover songs
- Song covers/singing videos

Please respond with "false" for:
- News
- Podcasts
- Gaming streams/videos
- Educational content
- Comedy
- Product reviews

Analyze the title regardless of language (Japanese, Korean, English, etc.).
Respond only with either "true" or "false".

Title: ${title}
`;

  try {
    const retryCount = 2;
    let lastError = null;

    for (let i = 0; i <= retryCount; i++) {
      try {
        const response = await askGemini(prompt);
        if (!response?.candidates?.[0]?.content?.parts?.[0]?.text) {
          throw new Error('Invalid response format from Gemini');
        }
        
        const responseText = response.candidates[0].content.parts[0].text.toLowerCase().trim();
        if (responseText === 'true' || responseText === 'false') {
          console.log('📊 Music detection result:', responseText);
          return responseText === 'true';
        } else {
          throw new Error('Invalid response: ' + responseText);
        }
      } catch (error) {
        lastError = error;
        if (i < retryCount) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          continue;
        }
      }
    }

    throw lastError;
  } catch (error) {
    console.error('❌ fetchMusicOrNot Error:', error);
    return false;
  }
};
