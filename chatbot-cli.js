import 'dotenv/config';
import readline from 'node:readline';

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_MODEL = 'mistral-small-latest';

const history = [
  {
    role: 'system',
    content: "Tu es un assistant utile et concis. Tu te souviens de tout ce qui a été dit dans cette conversation.",
  },
];

async function chat(userMessage) {
  history.push({ role: 'user', content: userMessage });

  const response = await fetch(MISTRAL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MISTRAL_API_KEY}`,
    },
    body: JSON.stringify({
      model: MISTRAL_MODEL,
      messages: history,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    history.pop();
    const err = await response.text();
    throw new Error(`Mistral API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const assistantMessage = data.choices[0].message.content;

  history.push({ role: 'assistant', content: assistantMessage });

  return assistantMessage;
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

console.log('Chatbot CLI — Phase 2. (Ctrl+C pour quitter)');
console.log('Commandes : /history\n');

async function main() {
  while (true) {
    const input = (await question('Vous : ')).trim();

    if (!input) continue;

    if (input === '/history') {
      printHistory();
      continue;
    }

    try {
      const reply = await chat(input);
      console.log(`IA : ${reply}\n`);
    } catch (err) {
      console.error(`Erreur : ${err.message}\n`);
    }
  }
}

main();

