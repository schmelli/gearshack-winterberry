# Development Setup

Complete guide to setting up Gearshack Winterberry for local development.

## Prerequisites

### Required Software

- **Node.js**: >= 22.13.0 (LTS)
- **npm**: >= 11.9.0 (comes with Node.js)
- **Git**: Latest version
- **Code Editor**: VS Code recommended

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "supabase.supabase-vscode",
    "GitHub.copilot"
  ]
}
```

---

## Step 1: Clone Repository

```bash
# Clone the repo
git clone https://github.com/schmelli/gearshack-winterberry.git
cd gearshack-winterberry

# Checkout development branch
git checkout development
```

---

## Step 2: Install Dependencies

```bash
npm install
```

**This installs 100+ packages** including:
- Next.js 16, React 19, TypeScript 5
- Supabase client, Mastra, Vercel AI SDK
- Tailwind CSS 4, shadcn/ui components
- All development tools (ESLint, Vitest, etc.)

**Expected time**: 2-5 minutes depending on network

---

## Step 3: Environment Variables

### Copy Template

```bash
cp .env.example .env.local
```

### Required Variables

Edit `.env.local` and fill in:

#### 1. Supabase

```bash
# Get from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Get from: Database > Connection string > URI
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

**How to get**:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Settings → API → Project URL & anon key
4. Settings → Database → Connection string (URI mode)

#### 2. Vercel AI Gateway

```bash
# Get from: https://vercel.com/account/tokens
AI_GATEWAY_API_KEY=sk_vercel_...
```

**How to get**:
1. Go to [Vercel Dashboard](https://vercel.com/account/tokens)
2. Create new token with AI Gateway access
3. Copy token (starts with `sk_vercel_`)

#### 3. Cloudinary

```bash
# Get from: https://cloudinary.com/console
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123456
```

**How to get**:
1. Go to [Cloudinary Console](https://cloudinary.com/console)
2. Dashboard shows Cloud name, API Key, API Secret
3. Copy all three

#### 4. Sentry (Optional for development)

```bash
NEXT_PUBLIC_SENTRY_DSN=https://...@....ingest.de.sentry.io/...
SENTRY_ORG=gearshack
SENTRY_PROJECT=gearshack-winterberry
SENTRY_AUTH_TOKEN=sntrys_...
```

**Skip in development**: Set to empty strings if you don't want Sentry.

### Optional Variables

```bash
# AI Models (defaults are fine)
AI_CHAT_MODEL=anthropic/claude-sonnet-4-5
OM_MODEL=google/gemini-2.5-flash

# Mastra Memory
MASTRA_MEMORY_LAST_MESSAGES=20
OBSERVATIONAL_MEMORY_ENABLED=true
OM_MESSAGE_TOKENS=20000
OM_OBSERVATION_TOKENS=40000

# Feature Flags
WORKING_MEMORY_ENABLED=true
AI_GENERATION_ENABLED=true
```

---

## Step 4: Database Setup

### Option A: Use Shared Supabase (Recommended)

If you have access to the shared development database, skip to Step 5.

### Option B: Local Supabase (Advanced)

**Install Supabase CLI**:
```bash
npm install -g supabase
```

**Start local Supabase**:
```bash
supabase start
```

**Run migrations**:
```bash
supabase db reset
```

**Update .env.local** with local values:
```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

---

## Step 5: Start Development Server

```bash
npm run dev
```

**Output**:
```
▲ Next.js 16.1.6 (Turbopack)
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000

✓ Starting...
✓ Ready in 3.2s
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Step 6: Verify Setup

### 1. Homepage Loads

You should see the landing page with:
- Gearshack logo
- Login/Register buttons
- Nature background

### 2. Authentication Works

Click "Login" → Try Google OAuth or email/password.

**Expected**: Login modal appears, auth flow works.

### 3. Database Connection

After login, navigate to Inventory.

**Expected**: Page loads (even if empty).

### 4. AI Assistant (Optional)

Click AI assistant icon.

**Expected**: Chat interface opens.

**If error**: Check AI_GATEWAY_API_KEY and DATABASE_URL.

---

## Common Issues

### Port 3000 Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 PID

# Or use different port
PORT=3001 npm run dev
```

### Module Not Found

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Supabase Connection Error

**Error**: `Failed to connect to database`

**Fix**:
1. Check DATABASE_URL format (must be connection pooler URL)
2. Verify project is not paused (Supabase dashboard)
3. Check IP allowlist (add 0.0.0.0/0 for development)

### AI Gateway Error

**Error**: `AI_GATEWAY_KEY is required`

**Fix**:
1. Verify AI_GATEWAY_API_KEY in .env.local
2. Check token is valid (Vercel dashboard)
3. Ensure token has AI Gateway access

### Cloudinary Upload Fails

**Error**: `Cloudinary upload failed`

**Fix**:
1. Check all 3 env vars are set
2. Verify API secret is correct
3. Test upload in Cloudinary console

---

## Development Workflow

### 1. Create Feature Branch

```bash
# Always branch from development
git checkout development
git pull origin development

# Create feature branch
git checkout -b 055-your-feature-name
```

**Naming**: `{feature-number}-{feature-name}`

### 2. Make Changes

Edit code, following [CLAUDE.md](../../CLAUDE.md) guidelines:
- TypeScript strict mode
- Feature-Sliced Light architecture
- Tailwind CSS only
- shadcn/ui components

### 3. Test Locally

```bash
# Run linter
npm run lint

# Run tests (if any)
npm test

# Build to catch TypeScript errors
npm run build
```

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add awesome feature"
```

**Commit format**: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`

### 5. Push and Create PR

```bash
git push -u origin 055-your-feature-name
```

**On GitHub**:
1. Create Pull Request
2. Target branch: `development` (NOT main!)
3. Fill in description
4. Request review

---

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm run test:coverage

# UI mode
npm run test:ui
```

### E2E Tests (Playwright)

```bash
# Install Playwright
npx playwright install

# Run E2E tests
npm run test:e2e
```

---

## Database Migrations

### Create New Migration

```bash
# Generate timestamp
date +"%Y%m%d%H%M%S"
# Example: 20260206120000

# Create file
touch supabase/migrations/20260206120000_add_new_feature.sql
```

**File content**:
```sql
-- Add new column
ALTER TABLE table_name ADD COLUMN IF NOT EXISTS new_column TEXT;

-- Create index
CREATE INDEX IF NOT EXISTS idx_new_column ON table_name(new_column);

-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY IF NOT EXISTS "policy_name" ON table_name
  FOR SELECT USING (user_id = auth.uid());
```

### Apply Migrations

**Local Supabase**:
```bash
supabase db reset
```

**Hosted Supabase**:
```bash
supabase db push
```

### Rollback Migration

```bash
# Manually delete the migration file
rm supabase/migrations/20260206120000_add_new_feature.sql

# Reset database
supabase db reset
```

---

## Mastra Studio

### Start Studio

```bash
npx mastra dev
```

**Output**:
```
Mastra Studio starting on http://localhost:4111
✓ Ready
```

Open [http://localhost:4111](http://localhost:4111) to see:
- Conversation history
- Memory usage (Observational Memory)
- Tool calls
- Metrics & costs

**See**: [Mastra Studio Guide](mastra-studio.md)

---

## Debugging

### Next.js DevTools

In browser console:
```javascript
// Check Next.js version
console.log(window.next)

// Check build info
console.log(__NEXT_DATA__)
```

### React DevTools

Install [React DevTools](https://react.dev/learn/react-developer-tools) browser extension.

**Features**:
- Component tree
- Props/state inspection
- Performance profiling

### Supabase DevTools

Install [Supabase DevTools](https://supabase.com/docs/guides/getting-started/local-development#supabase-cli) CLI.

```bash
# Check connection
supabase db ping

# Run SQL query
supabase db query "SELECT * FROM profiles LIMIT 10;"
```

### OpenTelemetry Tracing

**View traces**:
1. Start dev server with tracing enabled
2. Make requests
3. Check console for trace IDs
4. View in Mastra Studio or Jaeger

---

## Hot Reload

Next.js supports Hot Module Replacement (HMR):
- **TypeScript/JSX changes**: Instant update
- **CSS changes**: Instant update
- **Server Component changes**: Fast Refresh
- **API Route changes**: Requires page refresh

**Tips**:
- Keep dev server running
- Use multiple terminal tabs
- Watch console for errors

---

## Build Optimization

### Analyze Bundle

```bash
# Generate bundle analysis
ANALYZE=true npm run build
```

Opens visualization showing:
- Bundle sizes
- Largest dependencies
- Code splitting

### Check Performance

```bash
# Run Lighthouse
npm run lighthouse

# Or use Chrome DevTools → Lighthouse tab
```

---

## Environment-Specific Configs

### Development

- Hot reload enabled
- Source maps enabled
- Verbose logging
- No minification

### Production

- Optimized builds
- Minification
- Tree-shaking
- No source maps (unless Sentry)

**Build for production**:
```bash
npm run build
npm start
```

---

## Troubleshooting Development Issues

### TypeScript Errors in IDE

**Issue**: Red squiggles everywhere

**Fix**:
```bash
# Restart TypeScript server in VS Code
Cmd+Shift+P → "TypeScript: Restart TS Server"

# Or regenerate types
npm run dev  # Generates .next/types
```

### Tailwind CSS Not Working

**Issue**: Classes not applying

**Fix**:
1. Check `tailwind.config.ts` content paths
2. Restart dev server
3. Clear `.next` cache: `rm -rf .next`

### Supabase RLS Blocking Queries

**Issue**: Queries return empty

**Fix**:
1. Check RLS policies in Supabase dashboard
2. Verify `auth.uid()` matches user ID
3. Test query in SQL editor with user JWT

### Memory Leaks

**Issue**: Dev server slows down over time

**Fix**:
```bash
# Restart dev server
Ctrl+C
npm run dev

# Or increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

---

## Best Practices

### 1. Keep Dependencies Updated

```bash
# Check outdated packages
npm outdated

# Update safely (minor/patch)
npm update

# Update major versions (test thoroughly)
npm install package@latest
```

### 2. Use Git Hooks

**Pre-commit** (runs before commit):
```bash
# .git/hooks/pre-commit
#!/bin/sh
npm run lint
npm test
```

### 3. Clean Build Artifacts

```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules
rm -rf node_modules package-lock.json
npm install
```

### 4. Monitor Console

Always keep browser console open:
- Errors appear immediately
- Network requests visible
- React warnings shown

---

## Quick Reference

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Run tests
npm test

# Start Mastra Studio
npx mastra dev

# Run Supabase locally
supabase start

# Generate types from Supabase
supabase gen types typescript --local > types/database.ts

# Seed ontology (categories)
npm run seed:ontology
```

---

## Related Docs

- [Deployment Guide](deployment.md)
- [Database Migrations Guide](database-migrations.md)
- [Troubleshooting Guide](troubleshooting.md)
- [Testing Guide](testing.md)
- [Mastra Studio Guide](mastra-studio.md)

---

**Last Updated**: 2026-02-06
**Node Version**: 22.13.0+
**Next.js Version**: 16.1.1+
