# KadeQuote — Local-First AI Quotation Maker

> **Private, on-device AI quotation generator for electricians, plumbers, repair technicians, and small service businesses.**

Built with **Next.js (App Router)** and **Ollama running Gemma 3 1B**. Customer data and quotations never leave your machine.

---

## 🌟 Key Features

1. **Local-First AI Note Parser (`gemma3:1b`)**:
   - Converts informal job notes (e.g., *"Replace 3 switches, repair socket, labour 2500 rupees, switches 450 each and socket parts 800"*) into structured line items.
   - Intelligent categorization (`material`, `labour`, `service`, `other`).
   - Automatically cross-references your saved business price list.
   - Strictly marks uncertain/unpriced items as requiring human review—no silent hallucination.

2. **100% Offline & Private (IndexedDB via `idb`)**:
   - Stores quotations, business profiles, and numbering sequences locally in the browser.
   - Zero external cloud AI APIs (no OpenAI, no Anthropic, no telemetry).
   - Works offline once the app and model are loaded.

3. **Deterministic Financial Calculations**:
   - Strict 2-decimal rounded precision in TypeScript (no floating-point rounding errors).
   - Configurable discounts (fixed monetary or percentage).
   - Additional charges (transport, delivery, emergency fee).
   - Optional tax rate calculator with clear non-binding estimate notice.

4. **Professional PDF Generation (`jspdf` & `jspdf-autotable`)**:
   - Clean, professional design with company logo, bill-to block, itemized table, summary box, payment terms, and signature lines.
   - Downloadable directly in-browser.

5. **Business Profile & Reusable Price List**:
   - Company branding, logo upload (stored locally as Base64 in IndexedDB), default currency, validity period, and standard labour rates.
   - Reusable materials and service rates that guide Gemma 3 1B during note parsing.

6. **Sequential Quotation Numbering**:
   - Atomic sequential quotation numbers (e.g. `KQ-2026-0001`) persisted locally to prevent accidental reuse.

7. **Data Backup & Restore**:
   - Full JSON export of all quotations and configuration.
   - Schema-validated import with error checking and factory reset option.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router with React 19)
- **Local AI Engine**: Ollama running `gemma3:1b` (via HTTP endpoint `http://127.0.0.1:11434`)
- **Styling**: Tailwind CSS v4 & Lucide React icons
- **Validation**: Zod schema validation for AI input/output, forms, and backups
- **Local Storage**: IndexedDB (using `idb`)
- **PDF Generation**: `jspdf` and `jspdf-autotable`
- **Testing**: Vitest with unit tests and live Ollama integration tests
- **Package Manager**: pnpm

---

## 🚀 Getting Started on Windows 11 (PowerShell)

### Step 1: Install & Start Ollama

1. Download and install Ollama from [ollama.com](https://ollama.com/download).
2. Open PowerShell and pull the lightweight Gemma 3 1B model:

```powershell
ollama run gemma3:1b
```

3. Ollama runs as a background service listening on `http://127.0.0.1:11434`. You can verify it with:

```powershell
curl.exe -s http://127.0.0.1:11434/api/tags
```

---

### Step 2: Configure Environment Variables

Create `.env.local` in the project root (already seeded with defaults):

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=gemma3:1b
```

---

### Step 3: Install Dependencies

```powershell
pnpm install
```

---

### Step 4: Run Automated Tests

Run the full test suite (including calculation tests, validation tests, numbering tests, and live Ollama inference):

```powershell
pnpm test
```

---

### Step 5: Start the Development Server

```powershell
pnpm run dev
```

Open your browser to:

👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🧪 Verification & Automated Checks

- **Linting**:
  ```powershell
  pnpm run lint
  ```
  *(Passes with 0 errors and 0 warnings)*

- **Production Build**:
  ```powershell
  pnpm run build
  ```
  *(Compiles static pages and dynamic Route Handlers cleanly)*

- **Test Suite**:
  ```powershell
  pnpm test
  ```
  *(30 automated tests passing)*

---

## 🔒 Privacy & Offline Trust Boundary

- **Local Trust Boundary**: The server-side route handler `/api/ai/parse-quotation` communicates exclusively over `localhost` (`127.0.0.1`) to the locally installed Ollama daemon.
- **Client Storage**: All customer names, contact info, job notes, and quotes are persisted in the browser's IndexedDB database (`kadequote_local_db`).
- **Telemetry**: Zero tracking, analytics, or external API keys are used.

---

## 📄 License

MIT License. Suitable for Hacktoberfest 2026 open-source contributions.
