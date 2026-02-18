# ⚔️ 7G Wiki – Sieben Gezeichnete

Eine private Kampagnen-Enzyklopädie für DSA-Gruppen, ähnlich wie WorldAnvil.  
**Frontend:** React + TypeScript + Vite + TailwindCSS (GitHub Pages)  
**Backend:** Supabase (Postgres + Auth + Storage)

---

## Features

- 📖 **Wiki/Artikel** – 10 Typen (Ort, NPC, Fraktion, Gegenstand, …), Rich-Text-Editor (TipTap)
- 🗂️ **Collections** – Hierarchische Ordnerstruktur
- 🔗 **Interne Links** – `[[Artikelname]]` Syntax + automatische Backlinks
- 🔍 **Volltextsuche** – PostgreSQL `tsvector` (Deutsch)
- 📅 **Session-Manager** – Datum, Agenda, Recap, ToDos, Loot, Hooks
- 🗺️ **Karten** – Upload + Pins, die auf Artikel verlinken können
- 👥 **Rollen** – GM, Editor, Spieler mit RLS-Absicherung
- 🔑 **Einladungscodes** – GM generiert Codes, Spieler treten bei
- 🌙 **Dark Mode** – systemweit, keine Ablenkung

---

## Setup (lokal)

### 1. Repo klonen & Dependencies installieren

```bash
git clone https://github.com/DEIN-NAME/7g-wiki.git
cd 7g-wiki
npm install
```

### 2. Environment-Variablen

```bash
cp .env.example .env
```

Trage deine Supabase-Daten ein:
```env
VITE_SUPABASE_URL=https://amqirtrnoopriimopnns.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_vDWy0vNO-2-C21TMo0ogIQ_7nfnX02G
VITE_BASE_PATH=/
```

### 3. Supabase Datenbank einrichten

1. Öffne **Supabase Dashboard** → Dein Projekt → **SQL Editor**
2. Kopiere den Inhalt von [`schema.sql`](./schema.sql) und führe ihn aus
3. Das Script:
   - Erstellt alle Tabellen, Indizes, Funktionen
   - Aktiviert RLS mit allen Policies
   - Erstellt den `assets` Storage Bucket

### 4. Erste Welt anlegen (Seed)

Nach dem Ausführen von `schema.sql`:
1. Gehe zu Supabase → **Authentication** → **Users**
2. Erstelle manuell einen User oder starte die App und registriere dich
3. Kopiere deine User-UUID
4. Führe im SQL Editor aus (UUID ersetzen):
```sql
-- Welt anlegen
INSERT INTO public.worlds (name, description, owner_id)
VALUES ('DSA – Sieben Gezeichnete', 'Kampagne in Aventurien.', 'DEINE-USER-UUID');

-- Dich als GM hinzufügen
INSERT INTO public.world_members (world_id, user_id, role, status)
VALUES (
  (SELECT id FROM public.worlds WHERE name = 'DSA – Sieben Gezeichnete'),
  'DEINE-USER-UUID', 'gm', 'active'
);
```

### 5. Lokalen Dev-Server starten

```bash
npm run dev
```

Öffne http://localhost:5173

---

## GitHub Pages Deploy

### 1. GitHub Secrets einrichten

Gehe zu deinem GitHub Repo → **Settings** → **Secrets and variables** → **Actions**:

| Secret | Wert |
|--------|------|
| `VITE_SUPABASE_URL` | `https://amqirtrnoopriimopnns.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_vDWy0vNO-2-C21TMo0ogIQ_7nfnX02G` |
| `VITE_BASE_PATH` | `/7g-wiki/` (Repo-Name mit Slashes, z.B. `/7g-wiki/`) |

### 2. GitHub Pages aktivieren

Gehe zu **Settings** → **Pages** → Source: **GitHub Actions**

### 3. Pushen

```bash
git add .
git commit -m "initial deploy"
git push origin main
```

Der Workflow startet automatisch. Nach ~2 Minuten ist die App unter  
`https://DEIN-NAME.github.io/7g-wiki/` erreichbar.

### 4. Supabase Auth Redirect URLs

In Supabase → **Authentication** → **URL Configuration**:
- **Site URL:** `https://DEIN-NAME.github.io/7g-wiki`
- **Redirect URLs:** `https://DEIN-NAME.github.io/7g-wiki/` hinzufügen

---

## Routing

Die App nutzt `HashRouter` (URLs mit `#`), damit GitHub Pages kein Server-Setup benötigt:
- `https://dein.github.io/7g-wiki/#/articles`
- `https://dein.github.io/7g-wiki/#/maps/123`

---

## Benutzer einladen (Spieler/Editors)

1. Als GM einloggen
2. **Mitglieder** → **Einladen**
3. Rolle wählen (Spieler/Editor)
4. Generierten Code dem Mitspieler mitteilen
5. Mitspieler öffnet `/#/invite`, gibt Code + E-Mail ein

---

## Dateistruktur

```
7g-wiki/
├── .github/workflows/deploy.yml    # GitHub Actions Deploy
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── editor/
│   │   │   └── RichEditor.tsx      # TipTap Rich-Text-Editor
│   │   ├── layout/
│   │   │   └── AppLayout.tsx       # Sidebar + Navigation
│   │   └── ui/                     # Reusable UI components
│   ├── hooks/
│   │   ├── useAuth.tsx             # Auth Context
│   │   ├── useDebounce.ts
│   │   └── useWorld.tsx            # World/Role Context
│   ├── lib/
│   │   ├── linkParser.ts           # [[Internal Link]] Parser
│   │   ├── linkParser.test.ts      # Unit Tests
│   │   └── supabase.ts             # Supabase Client
│   ├── pages/                      # Route Pages
│   ├── services/                   # Data Access Layer
│   │   ├── article.service.ts
│   │   ├── asset.service.ts
│   │   ├── auth.service.ts
│   │   ├── collection.service.ts
│   │   ├── map.service.ts
│   │   ├── session.service.ts
│   │   └── world.service.ts
│   ├── types/
│   │   ├── database.ts             # Supabase DB Types
│   │   └── index.ts
│   ├── App.tsx                     # Router Setup
│   ├── index.css                   # Tailwind + Custom Styles
│   └── main.tsx
├── schema.sql                      # Komplettes DB Schema + RLS
├── .env.example
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Sicherheit

- **Alle Tabellen** haben Row Level Security (RLS) aktiviert
- **Kein Zugriff** ohne aktiven `world_members` Eintrag
- **GM-only Inhalte** (visibility='gm') sind für Spieler unsichtbar
- **Anon Key** ist sicher für das Frontend (kein Service Role Key im Repo)
- **Invite Codes** können nur einmalig verwendet werden

---

## Tests

```bash
npm test
```

Unit-Tests für den Link-Parser in `src/lib/linkParser.test.ts`.

---

## Technologie-Stack

| Technologie | Zweck |
|-------------|-------|
| React 18 + TypeScript | Frontend |
| Vite | Build Tool |
| TailwindCSS | Styling |
| TanStack Query | Data Fetching/Caching |
| TipTap | Rich-Text-Editor |
| React Router (Hash) | SPA Routing |
| Supabase JS Client | Backend-Kommunikation |
| Supabase Auth | Login, Magic Link |
| Supabase Storage | Bilder, Dateien |
| PostgreSQL (Supabase) | Datenbank + Volltextsuche |
| Vitest | Unit Tests |
| GitHub Actions | CI/CD Deploy |

---

## Roadmap (v1+)

- [ ] Timeline-Ansicht (visuell)
- [ ] Charakter-Beziehungsgraph (D3.js)
- [ ] Artikel-Diff-Ansicht (Versionen vergleichen)
- [ ] Tags-Verwaltung in der UI
- [ ] Charakter-Seite (PCs/NPCs mit Beziehungen)
- [ ] Exportieren als PDF
