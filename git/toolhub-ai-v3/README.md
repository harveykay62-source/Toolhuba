# ToolHub AI — v3

**66 free online tools.** Zero AI API usage. Pure rule-based logic. Fully modular.

## Quick Start

```bash
npm install
npm start
```

Server runs on `http://localhost:3000`

## Admin Login
- Email: `admin@toolhub.ai`  
- Password: `Admin@123`  
(Override via `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars)

## Architecture

```
toolhub-ai/
├── server.js                    # Express app + session + rate limiting
├── db/
│   ├── database.js              # sql.js SQLite, all DB helpers
│   └── tools.js                 # Tool registry (66 tools)
├── routes/
│   ├── auth.js                  # Login / register / logout
│   ├── tools.js                 # Main tool routes (delegates to modules)
│   ├── tools-extra.js           # Additional tool routes
│   ├── dashboard.js             # Admin + user dashboard API
│   └── api/text/                # Modular text tool engines
│       ├── aiDetector.js        # 15-vector AI detection
│       ├── humanizer.js         # 50-rule AI humanizer
│       ├── paraphraser.js       # Synonym + structural rewrite
│       ├── grammarFixer.js      # Rule-based grammar correction
│       ├── summarizer.js        # Sentence-scoring summarizer
│       ├── toneAnalyzer.js      # Sentiment + emotion detection
│       ├── textCleaner.js       # Multi-mode text normalization
│       ├── bulletPoints.js      # Prose → bullets converter
│       ├── clicheDetector.js    # Cliché + jargon detector
│       ├── sentenceExpander.js  # Sentence elaboration
│       ├── wordCounter.js       # Full text statistics
│       └── passwordGenerator.js # Secure password generation
├── public/
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── app.js               # SPA routing + home + auth
│       ├── tools.js             # All tool UIs (66 renderers)
│       ├── admin.js             # Admin panel UI
│       └── dashboard.js         # User dashboard UI
└── middleware/
    └── auth.js                  # Session auth middleware
```

## Environment Variables

```env
SESSION_SECRET=your_secret_here
ADMIN_EMAIL=admin@toolhub.ai
ADMIN_PASSWORD=Admin@123
ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXX
PAYPAL_CLIENT_ID=your_paypal_client_id
PORT=3000
```

## Key Features

- **66 tools** across Text, Media, and Utility categories
- **AI Content Detector** — 15-vector statistical analysis, fully deterministic
- **AI Text Humanizer** — 50 linguistic rules, zero external APIs
- **Client-side OCR** — Tesseract.js in the browser, image never uploaded
- **Admin panel** — Revenue tracking, AdSense config, PayPal integration, tool management
- **Modular backend** — Each text tool is an independent module in `routes/api/text/`
- **Rule-based only** — No OpenAI, no Anthropic, no external AI calls
