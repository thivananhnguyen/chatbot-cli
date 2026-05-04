import 'dotenv/config';

export const PROVIDERS = {
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
