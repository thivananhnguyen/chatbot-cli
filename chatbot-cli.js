import 'dotenv/config';
import readline from 'node:readline';

const PROVIDERS = {
  mistral: {
    url: 'https://api.mistral.ai/v1/chat/completions',
    key: process.env.MISTRAL_API_KEY,
    model: 'mistral-small-latest',
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    key: process.env.GROQ_API_KEY,
    model: 'llama-3.3-70b-versatile',
  },
};

let currentProvider = PROVIDERS.mistral;

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

async function chatStream(userMessage) {
  history.push({ role: 'user', content: userMessage });

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
    throw new Error(`Mistral API error ${response.status}: ${err}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';

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
      } catch {
        // chunk JSON invalide, on ignore
      }
    }
  }

  process.stdout.write('\n\n');
  history.push({ role: 'assistant', content: fullContent });

  return fullContent;
}

function printHistory() {
  console.log('');
  for (const msg of history) {
    const preview = msg.content.replace(/\n/g, ' ').slice(0, 80);
    console.log(`[${msg.role.padEnd(9)}] ${preview}`);
  }
  console.log('');
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

console.log('Chatbot CLI — Phase 4. (Ctrl+C pour quitter)');
console.log('Commandes : /history | /provider <nom>\n');

async function main() {
  while (true) {
    const input = (await question('Vous : ')).trim();

    if (!input) continue;

    if (input === '/history') {
      printHistory();
      continue;
    }

    if (input.startsWith('/provider ')) {
      switchProvider(input.slice(10).trim());
      continue;
    }

    try {
      await chatStream(input);
    } catch (err) {
      console.error(`Erreur : ${err.message}\n`);
    }
  }
}

main();

