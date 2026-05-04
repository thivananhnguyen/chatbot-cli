import 'dotenv/config';
import express from 'express';
import { PROVIDERS } from './providers.js';

const sessionHistory = [
  {
    role: 'system',
    content: "Tu es un assistant utile et concis. Tu te souviens de tout ce qui a été dit dans cette conversation.",
  },
];

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
    // Lancer un objet structuré — la route se chargera du pop()
    const err = await response.json().catch(() => ({}));
    throw { status: 502, message: 'Erreur API provider', detail: err };
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

// ─── GET /chat ────────
app.get('/chat', async (req, res) => {
  const { q, provider: providerName = 'mistral' } = req.query;

  // Validation & Sanitisation
  if (!q || typeof q !== 'string' || q.trim() === '') {
    return res.status(400).json({ error: 'Paramètre q manquant ou vide.' });
  }
  const userMessage = q.trim().slice(0, 4000); // limite 4000 chars

  const provider = PROVIDERS[providerName.toLowerCase()];
  if (!provider) {
    return res.status(400).json({
      error: `Provider inconnu : "${providerName}". Disponibles : ${Object.keys(PROVIDERS).join(', ')}`,
    });
  }

  try {
    const { reply, tokens } = await chat(userMessage, provider);
    res.json({ reply, provider: providerName.toLowerCase(), tokens });
  } catch (err) {
    sessionHistory.pop(); // annuler le push user (erreur 502 ou réseau)
    const statusCode = err.status || 500;
    const errorMessage = err.message || 'Erreur interne du serveur.';
    res.status(statusCode).json({ error: errorMessage, detail: err.detail });
  }
});

// ─── DELETE /history ─────
app.delete('/history', (req, res) => {
  sessionHistory.splice(1); // vider tout sauf le system prompt
  res.json({ message: 'Historique réinitialisé.', remaining: sessionHistory.length });
});

// ─── Démarrage du serveur ───────────
const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Chatbot API démarrée sur http://localhost:${PORT}`);
  console.log('  GET    /chat?q=<message>&provider=<nom>');
  console.log('  DELETE /history');
});
