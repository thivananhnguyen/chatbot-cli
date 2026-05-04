import 'dotenv/config';
import fs from 'node:fs/promises';
import { PROVIDERS } from './providers.js';

const providerName = process.argv[2] ?? 'mistral';
const PROVIDER = PROVIDERS[providerName] ?? PROVIDERS.mistral;

const SYSTEM_PROMPT =
  "Tu es un assistant spécialisé dans la synthèse de documents académiques. " +
  "Tu produis des résumés clairs, structurés et directement exploitables pour des révisions.";

async function summarize() {
  try {
    console.log("Lecture du fichier cours.txt...");
    const fileContent = await fs.readFile('cours.txt', 'utf8');

    const USER_PROMPT =
      "Résume le texte suivant en exactement 5 bullet points actionnables. " +
      "Chaque bullet point doit commencer par un verbe à l'infinitif et tenir en 1 à 2 lignes maximum.\n\n" +
      fileContent.trim().slice(0, 12000); // limite de sécurité

    console.log(`Résumé via ${PROVIDER.model}...\n`);
    const startTime = Date.now();

    const response = await fetch(PROVIDER.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PROVIDER.key}`,
      },
      body: JSON.stringify({
        model: PROVIDER.model,
        temperature: 0.3, // faible pour rester factuel
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: USER_PROMPT },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('Erreur API :', err);
      process.exit(1);
    }

    const data = await response.json();
    const summary = data.choices[0].message.content;
    const tokens = data.usage?.total_tokens ?? 0;
    const inputTokens = data.usage?.prompt_tokens ?? 0;
    const outputTokens = data.usage?.completion_tokens ?? 0;
    const latency = Date.now() - startTime;

    const cost =
      (inputTokens / 1000) * PROVIDER.costPer1kInput +
      (outputTokens / 1000) * PROVIDER.costPer1kOutput;

    console.log('─'.repeat(60));
    console.log(summary);
    console.log('─'.repeat(60));
    console.log(`[ ${PROVIDER.model} | ${latency}ms | ${tokens} tokens | coût : $${cost.toFixed(6)} ]`);

  } catch (error) {
    console.error(" Impossible de lire le fichier ou erreur réseau :", error.message);
  }
}

summarize();