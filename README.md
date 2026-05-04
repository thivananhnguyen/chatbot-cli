# Chatbot CLI multi-provider

Chatbot en ligne de commande avec mémoire conversationnelle, streaming, compression automatique du contexte, une mini API HTTP et un script de résumé de documents.

## Fonctionnalités

- Streaming des réponses token par token
- Mémoire conversationnelle avec historique côté client
- Compression automatique du contexte (résumé quand > 20 messages)
- Multi-provider : Mistral et Groq à la volée
- Commandes spéciales : `/history`, `/resume`, `/translate`, `/provider`
- Métriques par requête : latence, tokens, coût estimé
- Mini API Express : `GET /chat` et `DELETE /history`
- Résumé automatique de fichiers texte en 5 bullet points (`summarize.js`)

## Structure

```
chatbot-cli/
├── chatbot-cli.js   # Chatbot CLI interactif (phases 1–7)
├── api.js           # Mini API Express HTTP (phase 8)
├── summarize.js     # Script de résumé de document texte
├── cours.txt        # Fichier texte à résumer (non versionné)
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

## Résumé de document

`summarize.js` est un script autonome qui résume n'importe quel texte (cours, article, documentation) en **5 bullet points actionnables** via l'API Mistral ou Groq.

### Utilisation

1. Créez un fichier `cours.txt` dans le dossier du projet et collez-y le contenu à résumer
2. Lancez le script :

```powershell
# Avec Mistral (défaut)
npm run summarize

# Avec Groq
npm run summarize -- groq
```

### Exemple de sortie

```
Lecture du fichier cours.txt...
Résumé via mistral-small-latest...

────────────────────────────────────────────────────────────
- Identifier les trois conditions cumulatives de validité d'un contrat : consentement, capacité et contenu licite (art. 1128 C. civ.).
- Distinguer les trois vices du consentement : erreur sur les qualités essentielles, dol par manœuvres frauduleuses, violence physique ou morale.
- Retenir le principe de force obligatoire (art. 1103) et son exception : la théorie de l'imprévision introduite par la réforme de 2016.
- Appliquer l'effet relatif des contrats : seules les parties sont liées, sauf stipulation pour autrui.
- Connaître les remèdes à l'inexécution : résolution, exécution forcée en nature, dommages-intérêts — après mise en demeure.
────────────────────────────────────────────────────────────
[ mistral-small-latest | 1842ms | 748 tokens | coût : $0.000149 ]
```

### Paramètres configurables dans `summarize.js`

| Paramètre | Valeur par défaut | Description |
|---|---|---|
| `providerName` | `mistral` | Provider via argument CLI |
| `temperature` | `0.3` | Faible pour rester factuel |
| `slice(0, 12000)` | 12 000 chars | Limite de sécurité anti-spam tokens |
| Prompt | 5 bullet points | Verbe à l'infinitif, 1–2 lignes max |

