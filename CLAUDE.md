# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. It uses Claude AI (via Vercel AI SDK) to generate React components in a virtual file system, displayed in real-time in an iframe preview. The app supports both authenticated users (with persistence) and anonymous users (session-only).

## Setup and Commands

### Initial Setup
```bash
npm run setup
```
This installs dependencies, generates Prisma client, and runs database migrations.

### Development
```bash
npm run dev              # Start dev server with Turbopack
npm run dev:daemon       # Start dev server in background, logs to logs.txt
```

### Testing
```bash
npm test                 # Run all tests with Vitest
```
To run a single test file:
```bash
npx vitest src/path/to/test-file.test.tsx
```

### Build and Lint
```bash
npm run build            # Production build
npm run lint             # Run ESLint
```

### Database
```bash
npx prisma generate      # Regenerate Prisma client after schema changes
npx prisma migrate dev   # Create and apply new migration
npm run db:reset         # Reset database (WARNING: destroys all data)
```

## Code Style

- **Comments**: Use sparingly. Only comment complex code that isn't self-evident. Prefer clear variable/function names over explanatory comments.

## Architecture

### Virtual File System (VFS)

The core of UIGen is a **virtual file system** that exists only in memory. No generated files are written to disk.

- **Location**: `src/lib/file-system.ts`
- **Class**: `VirtualFileSystem`
- Files are stored in a `Map<string, FileNode>` structure with directory hierarchy
- Supports standard operations: create, read, update, delete, rename files/directories
- Serializes to JSON for database persistence (`Project.data` field)
- The VFS is reconstructed from serialized data on each chat request

### AI Component Generation Flow

1. **Chat API** (`src/app/api/chat/route.ts`):
   - Receives messages and serialized VFS from client
   - Reconstructs VFS from `files` parameter
   - Passes VFS to AI tools (`str_replace_editor`, `file_manager`)
   - Streams responses back to client
   - On completion, saves messages + VFS state to database (authenticated users only)

2. **AI Tools**:
   - **str_replace_editor** (`src/lib/tools/str-replace.ts`): Primary tool for creating/editing files in VFS
     - Commands: `view`, `create`, `str_replace`, `insert`, `undo_edit`
   - **file_manager** (`src/lib/tools/file-manager.ts`): For renaming and deleting files/folders

3. **System Prompt** (`src/lib/prompts/generation.tsx`):
   - Instructs AI to create React components using Tailwind CSS
   - Mandates `/App.jsx` as entry point (default export)
   - Uses `@/` import alias for local files (e.g., `import Foo from '@/components/Foo'`)

### Live Preview System

The preview transforms VFS files into runnable code in an iframe:

- **Location**: `src/lib/transform/jsx-transformer.ts`
- **Process**:
  1. Transform all `.jsx/.tsx` files using Babel (with TypeScript preset if needed)
  2. Create blob URLs for each transformed file
  3. Generate an import map mapping file paths to blob URLs
  4. Support `@/` alias by creating multiple import map entries per file
  5. Third-party imports (e.g., `lucide-react`) resolve via `https://esm.sh/{package}`
  6. Inject Tailwind CSS via CDN + any custom CSS files
  7. Generate HTML with import map, load entry point (default: `/App.jsx`)
  8. Render in sandboxed iframe with error boundary

- **Preview Component**: `src/components/preview/PreviewFrame.tsx`
- Entry point detection order: `/App.jsx`, `/App.tsx`, `/index.jsx`, `/index.tsx`, `/src/App.jsx`, etc.

### Authentication & Persistence

- **JWT-based auth** (`src/lib/auth.ts`): Sessions stored in HTTP-only cookies
- **Database**: SQLite via Prisma (schema in `prisma/schema.prisma`)
  - Prisma client generated to `src/generated/prisma/` (custom output path)
- **Models**:
  - `User`: email/password authentication (bcrypt hashed)
  - `Project`: stores messages (JSON) and VFS state (JSON) per user
- **Anonymous users**: VFS and messages stored in browser context only, migrated to DB on sign-up/sign-in (see `src/lib/anon-work-tracker.ts`)

### State Management

- **React Context**:
  - `ChatContext` (`src/lib/contexts/chat-context.tsx`): Manages chat messages, streaming, tool calls
  - `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`): Client-side VFS state, syncs with server responses

### Mock Provider

If `ANTHROPIC_API_KEY` is not set, the app uses a **mock language model** (`src/lib/provider.ts`):
- Returns static component code (counter, form, or card)
- Simulates multi-turn tool calling with delays
- Limited to 4 steps to prevent repetition

## Key Implementation Details

### File Imports
All local file imports in generated components **must** use the `@/` alias:
```javascript
// Correct
import Counter from '@/components/Counter'

// Incorrect
import Counter from '/components/Counter'
import Counter from './components/Counter'
```

The import map creates entries for all path variations (absolute, without leading slash, with `@/` prefix).

### CSS Support
- Tailwind CSS is injected via CDN in the preview iframe
- Custom `.css` files can be created in VFS and are collected during transformation
- CSS imports in JSX files are detected and removed (CSS is injected globally in preview HTML)

### Preview Updates
The preview refreshes when:
- VFS changes (tracked by `refreshTrigger` in FileSystemContext)
- A new file is created or modified via AI tools
- User manually edits code in the editor

### Database Migrations
After modifying `prisma/schema.prisma`:
1. Run `npx prisma migrate dev --name description_of_change`
2. Prisma client will auto-regenerate to `src/generated/prisma/`
3. Import from `@/lib/prisma` (singleton client instance)

### Testing
- **Framework**: Vitest with jsdom environment
- **Location**: Tests are colocated with source in `__tests__/` directories
- **Coverage**: File system, contexts, components (chat, editor, file tree)
- Uses `@testing-library/react` for component tests

## Common Gotchas

1. **Import paths**: Always use `@/` for local imports in generated components
2. **Entry point**: Every project needs `/App.jsx` with a default export
3. **Prisma output**: Custom output path is `src/generated/prisma/` (not default `node_modules/.prisma`)
4. **VFS serialization**: `Project.data` stores serialized FileNodes, `Project.messages` stores chat history
5. **Middleware**: Auth middleware only protects `/api/projects` and `/api/filesystem` routes (chat API is public)
6. **Preview errors**: Syntax errors in generated code are caught and displayed in preview with file path and line numbers
