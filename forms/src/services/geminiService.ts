import type { Form, FormField } from '../types/forms.types';

const getGeminiApiKey = () => {
  return import.meta.env.VITE_GEMINI_API_KEY;
};

export async function generateAIQuestions(form: Form): Promise<Form> {
  const key = getGeminiApiKey();
  if (!key) {
    console.warn("No Gemini API key found.");
    return form;
  }

  if (form.fields.length === 0) return form;

  const fieldsJson = form.fields.reduce((acc, f) => {
    acc[f.id] = {
      label: f.label,
      type: f.type,
      description: f.description || ''
    };
    return acc;
  }, {} as Record<string, any>);

  const prompt = `You are Kairos AI, a conversational and friendly form assistant.
The user is filling out a form titled "${form.title}".
Your task is to ask each question in a natural, conversational way based on the field label and type.

Here are the fields:
${JSON.stringify(fieldsJson, null, 2)}

Output ONLY a JSON object mapping the field ID to the conversational question string. Do not include markdown blocks like \`\`\`json. Keep questions concise, friendly, and human-like.`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7 }
      })
    });
    
    if (!res.ok) {
      console.error("Gemini API error status:", res.status);
      return form;
    }
    
    const data = await res.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      text = text.trim();
      if (text.startsWith('\`\`\`json')) text = text.slice(7);
      if (text.startsWith('\`\`\`')) text = text.slice(3);
      if (text.endsWith('\`\`\`')) text = text.slice(0, -3);
      
      const parsed = JSON.parse(text);
      
      const updatedFields = form.fields.map(f => ({
        ...f,
        ai_question: parsed[f.id] || f.label
      }));
      
      return { ...form, fields: updatedFields };
    }
  } catch (e) {
    console.error("Failed to generate AI questions:", e);
  }
  
  return form;
}
