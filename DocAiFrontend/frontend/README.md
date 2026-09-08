# BrainDoc — Frontend

React + Tailwind UI for the BrainDoc Spring AI RAG backend (`DocAiBackend`). Upload documents,
watch them get chunked and embedded into pgvector, then chat over them with grounded citations.

## Stack

| | |
|---|---|
| React 19 + TypeScript | UI |
| Vite 8 | dev server, dev proxy, build |
| Tailwind CSS 4 | styling (`@tailwindcss/vite`, CSS-variable theming) |
| TanStack Query 5 | server state, caching, invalidation |
| Zustand 5 | UI state, chat threads, upload queue |
| react-markdown + remark-gfm | rendering answers |
| lucide-react · sonner | icons · toasts |

## Running it

The backend must be up first (`DocAiBackend`, port 8080, with its Postgres/pgvector container).

```bash
npm install
npm run dev          # http://localhost:5173
```

`npm run build` produces `dist/`; `npm run typecheck` runs `tsc`; `npm run preview` serves the build.

### Configuration

Copy `.env.example` to `.env` only if your backend is not on `http://localhost:8080`.

- **`VITE_BACKEND_ORIGIN`** — where Spring Boot runs. Used by the Vite dev proxy and the
  Swagger link in the header.
- **`VITE_API_BASE_URL`** — leave empty in development. Requests then go to a relative
  `/api/...` and Vite proxies them, so the browser sees a same-origin app: no CORS preflight,
  and the token stream passes through untouched. Set it to an absolute origin only when
  serving the built bundle from somewhere that isn't in front of the backend.

## Features

- **Upload** — single or multiple files, drag anywhere in the window or use the dialog.
  Each file gets its own progress bar: a determinate bar while bytes upload, then an
  indeterminate one labelled *Parsing, chunking & embedding* for the server-side work.
  Files can be cancelled or retried individually, and uploads continue if you close the dialog.
- **Chat** — scoped to the whole corpus or to one document, with markdown answers,
  expandable source citations (file, page, chunk index, similarity), copy, export to Markdown,
  stop, retry, and per-scope threads persisted in `localStorage`.
- **Prompt templates** — four starter cards on the empty state that fill the composer.
- **Semantic search** (`⌘K`) — queries the vector store directly and shows the matching
  chunks with similarity scores and highlighted query terms.
- **Document details** — file size, chunk count, pages, upload date, a sample of the indexed
  vector chunks, plus *Chat with Document* and *Delete Document*.
- Light and dark themes, applied before first paint so there is no flash.

## How it maps to the backend

| UI | Endpoint |
|---|---|
| Upload dialog | `POST /api/v1/documents/upload` (one request per file) |
| Sidebar list | `GET /api/v1/documents` |
| Delete in detail dialog | `DELETE /api/v1/documents/{id}` |
| Chat, *Stream Tokens* on | `POST /api/v1/chat/stream` |
| Chat, *Stream Tokens* off | `POST /api/v1/chat/query` |
| Search dialog, citations, sample chunks | `POST /api/v1/chat/search/similarity` |

Three things are worth knowing:

**Uploads go one request per file.** `POST /api/v1/documents/upload-multiple` exists, but a
single batched request can only report one aggregate progress value. Uploading each file
separately gives every row its own bar, status and error message — and since
`uploadMultipleDocuments` loops over the batch sequentially on the server anyway, nothing is
lost. Two run concurrently (`UPLOAD_CONCURRENCY` in `src/hooks/useUploadQueue.ts`) to avoid
hammering the embedding API.

**Streaming asks for `text/plain`, not SSE.** `ChatController.streamQuestion` returns
`Flux<String>`, and Spring MVC picks its rendering from content negotiation. Requesting
`text/event-stream` would wrap every token in an SSE frame, whose framing mangles the newlines
that markdown answers are full of. Asking for `text/plain` takes the `ResponseBodyEmitter` path
and yields the raw token stream with whitespace intact. The client decodes either shape
(`createTokenDecoder` in `src/api/chat.ts`) so it cannot break if that ever changes.

**Citations during streaming come from a parallel search.** `/chat/stream` emits tokens only.
It retrieves with the same query, scope and `topK` as `/chat/search/similarity`, so the frontend
fires that in parallel and attaches the result — the same chunks the answer was grounded on.
With *Stream Tokens* off, citations come straight from `/chat/query`.

## Layout

```
src/
├── api/          # one module per backend controller
├── components/
│   ├── chat/     # composer, messages, markdown, citations, templates
│   ├── documents/# dropzone, cards, upload dialog, detail dialog
│   ├── layout/   # header, sidebar
│   ├── search/   # semantic search dialog
│   └── ui/       # button, modal, progress bar, toggle, badges…
├── hooks/        # queries, chat controller, upload queue, theme, hotkeys
├── lib/          # fetch wrapper + ApiResponse unwrapping, formatters, constants
├── store/        # zustand: UI state, chat threads, upload queue
└── types/api.ts  # mirrors the backend DTOs
```

`src/types/api.ts` matches the Java DTOs field for field — including the backend's
`filename` (metadata) vs `fileName` (upload response) difference.

## Keyboard

| | |
|---|---|
| `⌘K` / `Ctrl-K` | semantic search |
| `⌘U` / `Ctrl-U` | upload dialog |
| `Enter` | send · `Shift+Enter` newline |
| `Esc` | close dialog |
