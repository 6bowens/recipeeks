# 🍳 Recipeeks

> **Digitize your physical cookbook library, scan your pantry with AI, and cook tonight using exact book & page numbers.**

Recipeeks is a self-hosted, multi-user AI culinary companion. It replaces rigid workflow scripts with an intuitive, beautifully designed culinary dashboard built with Next.js, SQLite, Prisma, and Google Gemini 2.0 AI.

---

## ✨ Key Features

1. 📚 **Bookshelf Spine Vision Scanner**: Upload photos of your physical bookshelf. Gemini Multimodal AI extracts all recognized cookbook titles, authors, and editions while skipping cocktail/beverage books if desired.
2. 📖 **Fact vs. Inferred Recipe Indexing**: Digitize entire cookbook indexes with exact print page numbers, ingredient lists, mise-en-place checklists, and source links.
3. ❄️ **Fridge & Pantry AI Vision**: Snap photos of your fridge, freezer, or pantry cabinets to automatically log ingredients and set always-stocked staples (kosher salt, olive oil, garlic, etc.).
4. 🎯 **"What Can I Cook?" Matcher**: Cross-references your available pantry with every recipe in your collection. Shows match percentages, missing ingredients, and the exact physical cookbook & page number to open.
5. 👥 **Multi-User & Self-Hosted**: Individual accounts with personal libraries and pantries, SQLite persistence, and zero cloud lock-in.
6. 📊 **Export to Google Sheets / Excel**: One-click export of your complete library, recipe counts, and ingredients in CSV or JSON format.

---

## 🚀 Quick Start (Local Node)

### 1. Prerequisites
- Node.js 18+ or 20+
- A Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/) *(Optional: App has built-in smart mock fallbacks if no key is provided)*

### 2. Setup
```bash
# Clone or navigate to the project directory
cd /Users/brettowens/.gemini/antigravity/scratch/recipeeks

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env and paste your GEMINI_API_KEY

# Push database schema
npx prisma db push

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser!

---

## 🐳 Self-Hosting with Docker Compose

Deploy on your home server, VPS, Unraid, TrueNAS, or Synology NAS with one command:

```yaml
version: '3.8'

services:
  recipeeks:
    image: recipeeks:latest
    build: .
    container_name: recipeeks
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:/app/data/recipeeks.db
      - NEXTAUTH_SECRET=your-secure-random-secret-key
      - NEXTAUTH_URL=http://localhost:3000
      - GEMINI_API_KEY=your_gemini_api_key_here
      - GEMINI_MODEL=gemini-2.0-flash
    volumes:
      - recipeeks_data:/app/data

volumes:
  recipeeks_data:
    driver: local
```

Run:
```bash
docker compose up -d
```

---

## 📂 Project Architecture

```
recipeeks/
├── prisma/
│   └── schema.prisma            # SQLite database schema (Users, Cookbooks, Recipes, Ingredients, Pantry)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ai/scan-bookshelf/   # Gemini 2.0 bookshelf spine analyzer
│   │   │   ├── ai/index-recipes/    # Gemini recipe & page number indexer
│   │   │   ├── ai/scan-pantry/      # Gemini fridge/pantry scanner
│   │   │   ├── cookbooks/           # Cookbook & recipe CRUD
│   │   │   ├── pantry/              # Pantry items & staples CRUD
│   │   │   ├── match/               # Smart recipe matching engine
│   │   │   └── stats/export/        # CSV / Sheets export endpoint
│   │   ├── (auth)/                  # Login & Registration pages
│   │   ├── library/                 # Interactive Digital Bookshelf
│   │   ├── scan/                    # Bookshelf scanner & verification wizard
│   │   ├── pantry/                  # Pantry & Fridge manager
│   │   └── match/                   # 'What Can I Cook?' recommendations
│   ├── components/
│   │   ├── BookCard.tsx             # 3D tactile book covers
│   │   ├── RecipeModal.tsx          # Table of Contents & mise en place checklist
│   │   ├── PantryManager.tsx        # Pantry & fridge vision manager
│   │   └── RecipeMatcher.tsx        # Recommendation cards with page numbers
│   └── lib/
│       ├── gemini.ts                # Google Generative AI integration
│       ├── db.ts                    # Prisma singleton
│       └── auth.ts                  # NextAuth configuration
├── Dockerfile                       # Multi-stage production container
└── docker-compose.yml               # Container orchestration
```
