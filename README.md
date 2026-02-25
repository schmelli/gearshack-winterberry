# GearShack

The ultimate gear management platform for outdoor enthusiasts. Track every item, build perfect loadouts, and never forget essential gear again.

## Features

- **Gear Inventory** - Catalog all your outdoor gear with detailed specs, weights, images, and purchase info
- **Smart Loadouts** - Create weight-optimized packing lists for any adventure with real-time weight calculations
- **Product Intelligence** - Auto-populate specs from our gear database, get YouTube reviews, and AI-powered insights
- **Community** - Share your setups, get feedback, and discover new gear from fellow enthusiasts
- **Wishlist** - Track gear you're eyeing, compare options, and make informed purchase decisions
- **Multi-language** - Full support for English and German

## Tech Stack

- **Framework**: Next.js 16+ (App Router)
- **Language**: TypeScript 5.x (strict mode)
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui (new-york style)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email/password, Google OAuth)
- **Images**: Cloudinary (storage and optimization)
- **i18n**: next-intl

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account
- Cloudinary account

### Environment Setup

Create a `.env.local` file with the following variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

# Optional: External APIs
SERPER_API_KEY=your_serper_key  # For image search
YOUTUBE_API_KEY=your_youtube_key  # For video reviews
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
app/                    # Next.js App Router pages and layouts
  [locale]/             # i18n locale routes (en, de)
  api/                  # API routes
components/             # React components
  ui/                   # shadcn/ui base components
  auth/                 # Authentication components
  gear-detail/          # Gear detail modal and sections
  gear-editor/          # Gear item editor form
  inventory-gallery/    # Inventory grid and cards
  landing/              # Landing page sections
  layout/               # App shell, header, footer
  loadouts/             # Loadout management
  profile/              # User profile
hooks/                  # Custom React hooks
lib/                    # Utilities and services
  supabase/             # Supabase client and helpers
  validations/          # Zod schemas
messages/               # i18n translation files
types/                  # TypeScript type definitions
public/                 # Static assets
specs/                  # Feature specifications
supabase/               # Database migrations
```

## Architecture

This project follows **Feature-Sliced Light** architecture:

- **UI Components**: Stateless, receive data via props only
- **Custom Hooks**: All business logic, data fetching, and state management
- **Types**: All data models in `@/types`

Key patterns:
- Use `@/*` import alias for absolute imports
- Use shadcn/ui components from `@/components/ui`
- Tailwind CSS only (no separate CSS files)
- TypeScript strict mode (no `any` types)

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Contributing

1. Check `/specs` folder for feature specifications
2. Create TypeScript interfaces in `types/` first
3. Create the logic hook in `hooks/`
4. Create the UI component last
5. Follow existing patterns and code style

## License

Private - All rights reserved
