import 'dotenv/config';
import express from 'express';
import { PROVIDERS } from './providers.js';

const sessionHistory = [
  {
    role: 'system',
    content: "Tu es un assistant utile et concis. Tu te souviens de tout ce qui a été dit dans cette conversation.",
  },
];

// ─── Appel API sans streaming ───
async function chat(userMessage, provider) {
  sessionHistory.push({ role: 'user', content: userMessage });

  const response = await fetch(provider.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.key}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages: sessionHistory,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    sessionHistory.pop();
    const err = await response.text();
    throw new Error(`API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const reply = data.choices[0].message.content;
  const tokens = data.usage?.total_tokens ?? 0;

  sessionHistory.push({ role: 'assistant', content: reply });

  return { reply, tokens };
}

// ─── Express app ──────────
const app = express();
app.use(express.json());

// GET /chat?q=<message>&provider=<nom>
app.get('/chat', async (req, res) => {
  const q = req.query.q?.trim();
  const providerName = (req.query.provider ?? 'mistral').toLowerCase();

  if (!q) {
    return res.status(400).json({ error: 'Paramètre "q" manquant.' });
  }

  const provider = PROVIDERS[providerName];
  if (!provider) {
    return res.status(400).json({
      error: `Provider inconnu : "${providerName}". Disponibles : ${Object.keys(PROVIDERS).join(', ')}`,
    });
  }

  try {
    const { reply, tokens } = await chat(q, provider);
    res.json({ reply, provider: providerName, tokens });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /history
app.delete('/history', (req, res) => {
  sessionHistory.splice(1); // vider tout sauf le system prompt
  res.json({ message: 'Historique réinitialisé.' });
});

// ─── Démarrage ──────
const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Chatbot API — http://localhost:${PORT}`);
  console.log('  GET  /chat?q=<message>&provider=<nom>');
  console.log('  DELETE /history');
});
