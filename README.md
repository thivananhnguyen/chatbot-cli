# Chatbot CLI multi-provider

Chatbot en ligne de commande avec mémoire conversationnelle, streaming, compression automatique du contexte et une mini API HTTP.

## Fonctionnalités

- Streaming des réponses token par token
- Mémoire conversationnelle avec historique côté client
- Compression automatique du contexte (résumé quand > 20 messages)
- Multi-provider : Mistral et Groq à la volée
- Commandes spéciales : `/history`, `/resume`, `/translate`, `/provider`
- Métriques par requête : latence, tokens, coût estimé
- Mini API Express : `GET /chat` et `DELETE /history`

## Structure

```
chatbot-cli/
├── chatbot-cli.js   # Chatbot CLI interactif (phases 1–7)
├── api.js           # Mini API Express HTTP (phase 8)
├── providers.js     # Configuration des providers (source unique)
├── .env             # Clés API (non versionné)
├── .env.example     # Template des variables d'environnement
└── package.json
```

## Installation

```bash
npm install
```

## Configuration

Copiez `.env.example` en `.env` et renseignez vos clés :

```bash
cp .env.example .env
```

```env
MISTRAL_API_KEY=your_mistral_key
GROQ_API_KEY=your_groq_key
HF_API_KEY=your_hf_key
```

## Utilisation

### Chatbot CLI

```bash
npm run cli
```

#### Commandes disponibles

| Commande | Description |
|---|---|
| `/history` | Afficher les messages en mémoire avec index |
| `/provider <nom>` | Changer de provider (`mistral` ou `groq`) |
| `/resume` | Résumé bullet points de la conversation |
| `/translate <langue>` | Traduire la dernière réponse IA |

### API HTTP

```bash
npm run api
```

#### Endpoints

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/chat?q=<message>&provider=<nom>` | Envoyer un message |
| `DELETE` | `/history` | Réinitialiser l'historique |

## Tests rapides

### Chatbot CLI

Lancez `npm run cli` et testez les échanges suivants :

```
Vous : Mon prénom est Alice
IA   : Bonjour Alice !

Vous : Tu te souviens de mon prénom ?
IA   : Oui, votre prénom est Alice.

Vous : /provider groq
Provider changé : groq (llama-3.3-70b-versatile)

Vous : Qui es-tu ?
IA   : Je suis LLaMA, un assistant développé par Meta...

Vous : /translate anglais
Traduction : I am LLaMA, an assistant developed by Meta...

Vous : /resume
Résumé :
- S'appeler Alice et avoir été saluée
- Changer de provider vers Groq
- Demander l'identité de l'assistant
```

### API HTTP

```powershell
# Envoyer un message
Invoke-RestMethod "http://localhost:3000/chat?q=Mon prenom est Alice&provider=mistral"

# Vérifier la mémoire
Invoke-RestMethod "http://localhost:3000/chat?q=Quel est mon prenom"

# Changer de provider
Invoke-RestMethod "http://localhost:3000/chat?q=Qui es-tu&provider=groq"

# Réinitialiser l'historique
Invoke-RestMethod -Method DELETE "http://localhost:3000/history"
```

