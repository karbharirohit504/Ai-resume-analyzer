# AI Resume Analyzer (RESUMIND) — Project Overview

## 1) What this project is

This repository contains a **full‑stack (server-rendered) React Router v7 application** that lets a user:

1. **Log in with Puter** (third-party platform).
2. **Upload a resume (PDF)** along with job information (company, role/title, job description).
3. **Analyze the resume using Puter AI** (prompted to return a strict JSON shape).
4. **Store and view results** (resume PDF + generated preview image + AI feedback) in a dashboard.

In short: **upload resume → AI feedback → persist results → review later**.

### What it consists of (core capabilities)

- **Authentication**: handled by Puter (`puter.auth.*`).
- **Storage**:
  - Resume PDF stored in Puter filesystem (`puter.fs.upload/read/delete/readdir`).
  - A PNG preview of the resume (first page) generated client-side and stored in Puter filesystem.
  - Metadata + feedback stored in Puter key-value store (`puter.kv.*`).
- **AI analysis**: call Puter AI chat API with the uploaded file + an instruction prompt; response is parsed as JSON feedback.
- **JD-based scoring**: analysis explicitly includes a **Job Description match** section (keywords + requirements) and the app shows an **ATS score for this JD** based on that match score.
- **UI pages**:
  - Home: shows previously analyzed resumes (cards).
  - Upload: form + file uploader + progress states.
  - Resume detail: shows preview, PDF link, and feedback sections.
  - Wipe: developer/debug page to delete all app data in Puter for the current user.

## 2) How the app works (high-level flow)

### App bootstrap

- `app/root.tsx` loads Puter’s browser SDK script (`https://js.puter.com/v2/`) and calls `usePuterStore().init()` on mount.
- The store periodically checks until `window.puter` is available, then checks auth state.

### Routes and screens

Routes are defined in `app/routes.ts` (React Router v7 route config):

- `/` → `app/routes/home.tsx`
  - Requires auth; otherwise redirects to `/auth?next=/`.
  - Loads all keys matching `resume:*` from Puter KV and renders resume cards.

- `/auth` → `app/routes/auth.tsx`
  - Calls Puter sign-in/out.
  - After login, redirects to the `next` URL query param.

- `/upload` → `app/routes/upload.tsx`
  - Lets user provide company name, job title, job description, and upload a PDF resume.
  - On “Analyze”:
    1) Upload the PDF to Puter FS.
    2) Convert PDF page 1 → PNG in the browser (pdf.js).
    3) Extract resume text to improve JD matching:
       - Try **PDF text extraction** (first 1–2 pages via pdf.js text content).
       - If the PDF is scanned/image-based (little/no text), fall back to **OCR** on the generated first-page PNG using `puter.ai.img2txt`.
    3) Upload PNG to Puter FS.
    4) Write a KV record `resume:<uuid>` with paths + job info.
    5) Call AI feedback using the file path + a prompt that:
       - Treats the job description as the primary reference.
       - Includes an explicit `jdMatch` section (matched/missing keywords + missing requirements).
       - Uses extracted resume text as an additional hint (especially helpful for scanned PDFs).
    6) Parse JSON and update KV record with `feedback`.
    7) Navigate to `/resume/<uuid>`.

- `/resume/:id` → `app/routes/resume.tsx`
  - Loads resume record from KV.
  - Reads PDF + PNG blobs from Puter FS, creates object URLs, and renders:
    - `Summary` (overall and category scores)
    - `JD Match` (how well the resume matches the provided job description: score + matched/missing keywords + top gaps)
    - `ATS` (shown as “ATS Score (for this JD)”; uses `jdMatch.score` when available)
    - `Details` (accordion with detailed tips)
  - Also shows:
    - The exact job title/company + job description used for analysis
    - Extracted resume text (when available) for debugging
    - Raw feedback JSON (debug panel)

- `/wipe` → `app/routes/wipe.tsx`
  - Debug route to list Puter FS entries and delete them; also flushes KV.

### Data model

Types are declared (globally) in `types/index.d.ts`:

- `Resume` includes:
  - `id`
  - `resumePath` (Puter FS path to the PDF blob)
  - `imagePath` (Puter FS path to generated preview PNG)
  - `companyName`, `jobTitle` (optional)
  - `jobDescription` (captured from upload form)
  - `resumeTextHint` (extracted PDF text or OCR hint, used to improve JD-based matching; optional)
  - `feedback` (structured analysis)

- `Feedback` is a JSON-like structure with:
  - `overallScore`
  - `jdMatch` (optional):
    - `score` (0–100 match to the provided job description)
    - `matchedKeywords` / `missingKeywords`
    - `missingRequirements` (must-have / nice-to-have + how to address)
  - `ATS`, `toneAndStyle`, `content`, `structure`, `skills` (each has scores + tips)

The prompt template enforcing this JSON format lives in `constants/index.ts`.

## 3) Tech used in the project (and why)

### React Router v7 (SSR)

- Packages: `react-router`, `@react-router/dev`, `@react-router/node`, `@react-router/serve`
- Why:
  - Provides a **production-ready SSR runtime** and dev server tooling.
  - Route-file based experience with loaders/actions (even though this app mostly uses client effects).
  - Easy build output for Docker deployment.

### Vite

- Package: `vite`
- Why:
  - Fast dev server + HMR.
  - React Router v7 integrates with Vite via `@react-router/dev/vite`.

### TypeScript

- Package: `typescript`
- Why:
  - Strong typing for feedback JSON format and app data model.
  - Prevents common runtime bugs during refactors.

### Tailwind CSS v4

- Packages: `tailwindcss`, `@tailwindcss/vite`, `tailwind-merge`, `tw-animate-css`
- Why:
  - Rapid UI styling.
  - Tailwind v4 is integrated via CSS `@import "tailwindcss";` in `app/app.css`.
  - `tailwind-merge` + `clsx` used for className composition (`cn()` in `app/lib/utils.ts`).
  - `tw-animate-css` for simple animation utilities.

### Zustand

- Package: `zustand`
- Why:
  - Lightweight client-side state management for Puter state:
    - `isLoading`, `error`, `puterReady`
    - `auth`, `fs`, `kv`, `ai` APIs

### pdf.js (pdfjs-dist)

- Package: `pdfjs-dist`
- Why:
  - Converts PDF (resume) into a PNG preview (first page) entirely in the browser.
  - Worker is served from `public/pdf.worker.min.js` and referenced by `app/lib/pdf2img.ts`.

### react-dropzone

- Package: `react-dropzone`
- Why:
  - Drag-and-drop file upload UI with type/size restrictions.

### Express

- Package: `express`
- Why:
  - Indirectly used by React Router’s serve tooling / server build ecosystem.
  - The project uses `react-router-serve` for production serving rather than a custom Express server file.

## 4) Packages used (what each is for)

From `package.json`:

### Runtime dependencies

- `react`, `react-dom`: UI framework and DOM renderer.
- `react-router`, `react-router-dom`: routing primitives and hooks.
- `@react-router/node`: SSR runtime for Node.
- `@react-router/serve`: production server runner (`react-router-serve`).
- `zustand`: app state for Puter integration and auth/files/kv/ai wrappers.
- `pdfjs-dist`: PDF rendering and page-to-canvas conversion.
  - Also used for lightweight PDF text extraction (first pages) to help JD-based scoring.
- `react-dropzone`: file selection UI for PDF.
- `clsx`, `tailwind-merge`: ergonomic class composition and Tailwind conflict resolution.
- `isbot`: typically used for bot detection in SSR environments (mostly used internally by React Router).
- `express`: server dependency used by tooling/runtime.

### Dev dependencies

- `@react-router/dev`: dev server, route type generation, build integration.
- `vite`, `vite-tsconfig-paths`: bundler + TS path alias support (`~/*` → `app/*`).
- `typescript`, `@types/*`: TS compiler and typings.
- `tailwindcss`, `@tailwindcss/vite`, `postcss`, `autoprefixer`: Tailwind build pipeline.
- `tw-animate-css`: animation utilities.
- `prettier` (present in node_modules, not declared in this repo’s `package.json`): formatting (not required to run).

## 5) Folder and file structure (what lives where)

Top-level:

- `app/`: application source (routes, components, CSS, client utilities).
- `public/`: static assets (icons, images, pdf.js worker).
- `constants/`: prompt template(s) and sample data.
- `types/`: global TypeScript declarations for the app domain + Puter types.
- `react-router.config.ts`: SSR enabled/disabled config.
- `vite.config.ts`: Vite plugins (React Router + Tailwind + TS paths).
- `Dockerfile`: multi-stage build for production container.
- `package.json`: scripts + dependencies.

`app/`:

- `app/root.tsx`: HTML document layout, fonts, Puter script injection, error boundary.
- `app/routes.ts`: route config mapping URL paths → route modules.
- `app/routes/*`: page modules.
- `app/components/*`: reusable UI components for feedback display and upload.
- `app/lib/*`: helpers:
  - `puter.ts`: Zustand store wrapping Puter APIs.
  - `pdf2img.ts`: PDF first-page → PNG conversion + PDF text extraction.
  - `utils.ts`: `cn()`, `formatSize()`, `generateUUID()`.
- `app/app.css`: Tailwind + custom utilities and component classes.

`public/`:

- `public/pdf.worker.min.js`: pdf.js worker file served at `/pdf.worker.min.js`.
- `public/icons/`, `public/images/`: UI assets.

## 6) What we changed (important implementation notes)

These are fixes/improvements made during setup and debugging:

### Route file case sensitivity (Linux fix)

- **Why**: On Linux, `Resume.tsx` and `resume.tsx` are different; the router config referenced `routes/resume.tsx`.
- **Change**:
  - Renamed `app/routes/Resume.tsx` → `app/routes/resume.tsx` so `app/routes.ts` resolves correctly.

### SSR crash fix for pdf.js

- **Problem**: SSR tried to evaluate pdf.js module initialization and crashed (`GlobalWorkerOptions.workerSrc` on `undefined`).
- **Change** (`app/lib/pdf2img.ts`):
  - Ensure conversion only runs in the browser (`typeof window !== "undefined"`).
  - Set `workerSrc` inside the conversion function (browser-only).
- **Change** (`app/routes/upload.tsx`):
  - Dynamically import `convertPdfToImage` inside the analyze handler so SSR doesn’t eagerly evaluate the module.

### Prevent “Analyze” from crashing the page

- **Problem**: Unhandled errors (upload failure, AI failure, invalid JSON) could break the flow and appear like the frontend “closed”.
- **Change** (`app/routes/upload.tsx`):
  - Wrap the analyze flow in `try/catch`.
  - Convert failures into a visible status string (`Error: ...`) and stop the spinner cleanly.

### Reduce memory usage during PDF → image

- **Problem**: Very large PDFs can render huge canvases and cause browser OOM/crashes.
- **Change** (`app/lib/pdf2img.ts`):
  - Bound the rendering size by capping max dimension and using a safer scale.

### Fix noisy SSR error from Chrome `.well-known` probe

- **Problem**: Chrome sometimes requests `/.well-known/appspecific/com.chrome.devtools.json`; React Router logged “No route matches”.
- **Change**:
  - Added route to `app/routes.ts` and created `app/routes/chrome-devtools.tsx` returning `{}` JSON.

### Fix “Model not found” from Puter AI

- **Problem**: A hardcoded model id was not available for the logged-in Puter account.
- **Change** (`app/lib/puter.ts`):
  - Removed the hardcoded model override so Puter selects the account’s default available model.

## 7) How to run the project

### Local development

```bash
npm install
npm run dev
```

Open the printed URL (commonly `http://localhost:5173`).

### Typecheck

```bash
npm run typecheck
```

### Production build and serve

```bash
npm run build
npm run start
```

This serves on port `3000`.

### Docker

```bash
docker build -t ai-resume-analyser .
docker run -p 3000:3000 ai-resume-analyser
```

## 8) Important runtime requirements / assumptions

- The app relies on Puter’s web SDK script in `app/root.tsx`:
  - If the Puter websocket/API is blocked by a network, VPN, or browser privacy settings, uploads/kv/ai may fail.
- AI output is expected to be **strict JSON** based on the template in `constants/index.ts`.
  - If the model returns non-JSON, the upload page will show an error and ask to retry/shorten prompt.
