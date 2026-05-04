import 'dotenv/config';
import readline from 'node:readline';

const PROVIDERS = {
  mistral: {
    url: 'https://api.mistral.ai/v1/chat/completions',
    key: process.env.MISTRAL_API_KEY,
    model: 'mistral-small-latest',
    costPer1kInput: 0.0001,
    costPer1kOutput: 0.0003,
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    key: process.env.GROQ_API_KEY,
    model: 'llama-3.3-70b-versatile',
    costPer1kInput: 0.00059,
    costPer1kOutput: 0.00079,
  },
};

let currentProvider = PROVIDERS.mistral;
let totalTokensUsed = 0;
let totalCost = 0;

// ─── Phase 4 : Sélection de provider ──────
function switchProvider(name) {
  const provider = PROVIDERS[name.toLowerCase()];
  if (!provider) {
    console.log(`Provider inconnu : "${name}". Disponibles : ${Object.keys(PROVIDERS).join(', ')}\n`);
    return false;
  }
  currentProvider = provider;
  console.log(`Provider changé : ${name} (${provider.model})\n`);
  return true;
}

const history = [
  {
    role: 'system',
    content: "Tu es un assistant utile et concis. Tu te souviens de tout ce qui a été dit dans cette conversation.",
  },
];

const MAX_HISTORY = 20;

// ─── Phase 5 : Compression automatique ─────────
async function compressHistory() {
  const messageCount = history.length - 1;
  const conversation = history
    .slice(1)
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  const response = await fetch(currentProvider.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${currentProvider.key}`,
    },
    body: JSON.stringify({
      model: currentProvider.model,
      messages: [
        {
          role: 'system',
          content: 'Résume cette conversation en 3 à 5 phrases concises. Conserve uniquement les faits importants.',
        },
        { role: 'user', content: conversation },
      ],
      temperature: 0.3,
    }),
  });

  const data = await response.json();
  const summary = data.choices[0].message.content;

  history.splice(1, history.length - 1, {
    role: 'system',
    content: `Résumé de la conversation précédente : ${summary}`,
  });

  console.log(`\n💡 Contexte compressé (${messageCount} messages → 1 résumé)\n`);
}

// ─── Phase 3 : Streaming + métriques ──────────
async function chatStream(userMessage) {
  if (history.length > MAX_HISTORY) {
    await compressHistory();
  }

  history.push({ role: 'user', content: userMessage });

  const start = Date.now();

  const response = await fetch(currentProvider.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${currentProvider.key}`,
    },
    body: JSON.stringify({
      model: currentProvider.model,
      messages: history,
      temperature: 0.7,
      stream: true,
    }),
  });

  if (!response.ok) {
    history.pop();
    const err = await response.text();
    throw new Error(`API error ${response.status}: ${err}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let promptTokens = 0;
  let completionTokens = 0;

  process.stdout.write('IA : ');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));

    for (const line of lines) {
      const jsonStr = line.slice(6);
      if (jsonStr.trim() === '[DONE]') continue;

      try {
        const parsed = JSON.parse(jsonStr);
        const delta = parsed.choices[0]?.delta?.content;
        if (delta) {
          process.stdout.write(delta);
          fullContent += delta;
        }
        if (parsed.usage) {
          promptTokens = parsed.usage.prompt_tokens ?? 0;
          completionTokens = parsed.usage.completion_tokens ?? 0;
        }
      } catch {
        // chunk JSON invalide, on ignore
      }
    }
  }

  const latency = Date.now() - start;
  const tokens = promptTokens + completionTokens;
  totalTokensUsed += tokens;

  const cost = (promptTokens / 1000) * currentProvider.costPer1kInput
             + (completionTokens / 1000) * currentProvider.costPer1kOutput;
  totalCost += cost;

  process.stdout.write('\n');

  if (tokens > 0) {
    console.log(`[${currentProvider.model} | ${latency}ms | ${tokens} tokens | coût total : $${totalCost.toFixed(6)}]\n`);
  } else {
    console.log(`[${currentProvider.model} | ${latency}ms]\n`);
  }

  history.push({ role: 'assistant', content: fullContent });

  return fullContent;
}

// ─── Phase 6 : /resume ─────────
async function resumeConversation() {
  if (history.length <= 1) {
    console.log('Aucune conversation à résumer.\n');
    return;
  }

  const conversation = history.slice(1).map((m) => `${m.role}: ${m.content}`).join('\n');

  const response = await fetch(currentProvider.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${currentProvider.key}`,
    },
    body: JSON.stringify({
      model: currentProvider.model,
      messages: [
        {
          role: 'system',
          content: "Résume cette conversation en bullet points (5 max). Chaque bullet commence par un verbe à l'infinitif.",
        },
        { role: 'user', content: conversation },
      ],
      temperature: 0.3,
    }),
  });

  const data = await response.json();
  console.log('\nRésumé :');
  console.log(data.choices[0].message.content + '\n');
}

// ─── Phase 7 : /translate ─────
async function translateLast(targetLanguage) {
  const lastAssistant = [...history].reverse().find((m) => m.role === 'assistant');
  if (!lastAssistant) {
    console.log("Aucun message de l'IA à traduire.\n");
    return;
  }

  const response = await fetch(currentProvider.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${currentProvider.key}`,
    },
    body: JSON.stringify({
      model: currentProvider.model,
      messages: [
        {
          role: 'system',
          content: `Tu es un traducteur expert. Traduis le texte suivant en ${targetLanguage}. Retourne uniquement la traduction, sans commentaire ni explication.`,
        },
        { role: 'user', content: lastAssistant.content },
      ],
      temperature: 0.1,
    }),
  });

  const data = await response.json();
  // Ne PAS modifier history — c'est une méta-commande
  console.log('\nTraduction :');
  console.log(data.choices[0].message.content + '\n');
}

// ─── Phase 2 : Afficher l'historique ─────────────────────────────
function printHistory() {
  console.log('\n─── Historique ──────────────────────────────────────');
  history.forEach((m, i) => {
    const preview = m.content.length > 100 ? m.content.slice(0, 100) + '…' : m.content;
    console.log(`[${i}] ${m.role.padEnd(9)} : ${preview.replace(/\n/g, ' ')}`);
  });
  console.log(`─── ${history.length} message(s) ─────────────────────────────────\n`);
}

// ─── Boucle principale ──────────────────────────────────────────────
console.log('╔══════════════════════════════════════════════════╗');
console.log('║      Chatbot CLI — multi-provider + mémoire      ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log('Providers disponibles :', Object.keys(PROVIDERS).join(', '));
console.log('Commandes :');
console.log('  /history            — afficher les messages en mémoire');
console.log('  /provider <nom>     — changer de provider');
console.log('  /resume             — résumé bullet points de la conversation');
console.log('  /translate <langue> — traduire la dernière réponse IA');
console.log('(Ctrl+C pour quitter)\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function question(prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

while (true) {
  const input = (await question('Vous : ')).trim();

  if (!input) continue;

  if (input === '/history') {
    printHistory();
  } else if (input === '/resume') {
    await resumeConversation();
  } else if (input.startsWith('/translate ')) {
    await translateLast(input.slice(11).trim());
  } else if (input.startsWith('/provider ')) {
    switchProvider(input.slice(10).trim());
  } else {
    try {
      await chatStream(input);
    } catch (err) {
      console.error(`Erreur : ${err.message}\n`);
    }
  }
}

