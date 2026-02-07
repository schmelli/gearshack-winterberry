# Gearshack Winterberry Documentation

> **Your outdoor gear companion** - A comprehensive gear management platform with AI-powered assistance.

## 📚 Documentation Structure

### Architecture
- [System Overview](architecture/overview.md) - High-level architecture and tech stack
- [Database Schema](architecture/database-schema.md) - Supabase PostgreSQL schema
- [Tech Stack](architecture/tech-stack.md) - Technologies and frameworks used

### Features
- [AI Assistant](features/ai-assistant.md) - Mastra-powered AI gear assistant
- [Observational Memory](features/observational-memory.md) - Long-context memory system
- [Loadout Management](features/loadout-management.md) - Pack management and optimization
- [Inventory Gallery](features/inventory-gallery.md) - Gear catalog and item management
- [Social Features](features/social-features.md) - Following, friends, and activity feed
- [Community Features](features/community-features.md) - Shakedowns, marketplace, bulletin board

### Guides
- [Development Setup](guides/development-setup.md) - Getting started with local development
- [Deployment](guides/deployment.md) - Deploying to Vercel
- [Mastra Studio](guides/mastra-studio.md) - Using Mastra Studio for debugging
- [Database Migrations](guides/database-migrations.md) - Managing Supabase migrations
- [Feature Development](guides/feature-development.md) - Creating new features

### Decisions (ADRs)
- [ADR-001: Supabase Migration](decisions/adr-001-supabase-migration.md)
- [ADR-002: Observational Memory](decisions/adr-002-observational-memory.md)
- [ADR-003: Feature-Sliced Light](decisions/adr-003-feature-sliced-light.md)

## 🚀 Quick Links

- **Live App**: [gearshack.app](https://gearshack.app)
- **GitHub**: [schmelli/gearshack-winterberry](https://github.com/schmelli/gearshack-winterberry)
- **Supabase**: [Dashboard](https://supabase.com/dashboard)
- **Vercel**: [Deployment Dashboard](https://vercel.com)

## 🎯 For Claude Code

This wiki is designed to be accessible to Claude Code. Key sections:
- `/docs/architecture/overview.md` - Start here for system understanding
- `/docs/features/*.md` - Feature-specific implementation details
- `/docs/decisions/*.md` - Historical context for architectural choices

See [CLAUDE.md](../CLAUDE.md) in the root for coding guidelines.

## 📝 Contributing

When implementing new features:
1. Document in `/docs/features/{feature-name}.md`
2. Create ADR in `/docs/decisions/` for significant architectural changes
3. Update relevant guides in `/docs/guides/`
4. Link from CLAUDE.md if it affects coding patterns

## 🔍 Finding Information

```bash
# Search all docs
grep -r "search term" docs/

# List all features
ls docs/features/

# Read a specific guide
cat docs/guides/mastra-studio.md
```

---

**Last Updated**: 2026-02-06
**Version**: 1.0.0
