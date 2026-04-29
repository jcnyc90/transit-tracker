// api/recipe.js — Vercel serverless function
// Proxies Anthropic Claude API for recipe PDF chat.
// Client sends: { pdf: "<base64>", messages: [{role, content}] }
// PDF is attached to the first user message; full history is sent on every call.

import Anthropic from '@anthropic-ai/sdk';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '12mb',
    },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { pdf, messages } = req.body || {};

  if (!pdf || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'pdf (base64 string) and messages array are required' });
  }

  const client = new Anthropic({ apiKey });

  // Attach the PDF document block to the first user message only.
  // Subsequent user turns are plain text — Claude remembers the PDF through conversation context.
  const claudeMessages = messages.map((msg, i) => {
    if (i === 0 && msg.role === 'user') {
      return {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: pdf },
          },
          { type: 'text', text: msg.content },
        ],
      };
    }
    return { role: msg.role, content: msg.content };
  });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `You are a friendly, practical cooking assistant. The user has shared a recipe PDF with you. Help them with anything about it: ingredients, techniques, substitutions, scaling, timing, equipment, nutrition, or storage. Keep answers concise — this is a mobile chat. Use plain text only, no markdown.`,
      messages: claudeMessages,
    });

    return res.status(200).json({ response: response.content[0].text });
  } catch (err) {
    console.error('Claude API error:', err);
    return res.status(500).json({ error: 'Failed to get response from Claude', detail: err.message });
  }
}
