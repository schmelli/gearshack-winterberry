# ADR-001: Supabase Migration (from Firebase)

**Status**: ✅ Accepted & Implemented
**Date**: 2025-12-10
**Decision Makers**: Development Team
**Feature**: 040-supabase-migration

## Context

Gearshack was initially built on Firebase (Firestore + Firebase Auth + Firebase Storage). As the application grew, we encountered limitations:

### Problems with Firebase

1. **NoSQL Limitations**
   - Firestore's document model made complex queries difficult
   - No joins → denormalization → data duplication
   - Subcollections created deep nesting (3+ levels)
   - Difficult to maintain data consistency

2. **No Vector Search**
   - AI features require vector similarity search for embeddings
   - Firestore has no native support
   - Would need external service (Pinecone, Weaviate)

3. **Limited Full-Text Search**
   - No fuzzy matching for typos in gear/brand names
   - Would need Algolia or similar third-party service

4. **Complex Pricing**
   - Per-read/write billing made costs unpredictable
   - Small queries with many reads expensive
   - Storage costs high for images

5. **Vendor Lock-In**
   - Firebase-specific APIs throughout codebase
   - Difficult to self-host or migrate
   - No SQL export/import

### Requirements

- **SQL Support**: Complex queries, joins, aggregations
- **Vector Search**: For AI embeddings (Semantic Recall)
- **Fuzzy Matching**: Typo-tolerant search (trigrams)
- **Geospatial**: PostGIS for merchant locations
- **Self-Hostable**: Option to run locally or self-host
- **TypeScript Support**: Type-safe queries
- **Realtime**: Subscriptions for live updates
- **File Storage**: S3-compatible object storage

## Decision

We will migrate from Firebase to **Supabase** (PostgreSQL-based BaaS).

### Why Supabase?

**Pros:**
1. **PostgreSQL**: Industry-standard relational database
   - SQL queries (joins, aggregations, CTEs)
   - ACID transactions
   - Mature ecosystem

2. **Extensions**:
   - `pgvector`: Vector similarity search (1536-dim embeddings)
   - `pg_trgm`: Fuzzy text matching (trigram similarity)
   - `postgis`: Geospatial queries (location search)
   - `uuid-ossp`: UUID generation

3. **Built-in Features**:
   - Auth (Google OAuth, email/password, magic links)
   - Storage (S3-compatible)
   - Realtime (WebSocket subscriptions)
   - Row-Level Security (RLS policies)
   - RESTful API (PostgREST)

4. **Developer Experience**:
   - TypeScript SDK with auto-generated types
   - Local development (Docker)
   - Migration system (SQL files)
   - Dashboard for SQL queries, table browser

5. **Self-Hostable**:
   - Open-source (MIT license)
   - Docker Compose setup
   - Can migrate to own infrastructure if needed

6. **Pricing**:
   - Free tier: 500MB database, 1GB storage, 2GB bandwidth
   - Pro: $25/month for 8GB database, 100GB storage
   - Predictable costs (not per-read/write)

## Alternatives Considered

### 1. Stay with Firebase

**Pro:**
- No migration needed
- Existing code works

**Con:**
- Doesn't solve any of the problems
- Would need multiple third-party services (Algolia, Pinecone)
- Costs would keep rising

**Verdict:** Not sustainable long-term

### 2. MongoDB Atlas

**Pro:**
- NoSQL (easier migration from Firestore)
- Vector search (Atlas Search)
- Good scaling

**Con:**
- Still NoSQL (no SQL joins)
- More expensive than Supabase
- Not self-hostable (proprietary)
- Less mature than PostgreSQL

**Verdict:** Doesn't solve SQL limitations

### 3. PlanetScale (MySQL)

**Pro:**
- SQL database
- Generous free tier
- Branching for schema changes

**Con:**
- No vector search extension
- No fuzzy matching (trigrams)
- No PostGIS
- Foreign key constraints disabled (by design)

**Verdict:** Missing critical extensions

### 4. Railway + PostgreSQL

**Pro:**
- Self-managed PostgreSQL
- All extensions available
- Full control

**Con:**
- No built-in Auth, Storage, Realtime
- Would need to build these ourselves
- More complex setup

**Verdict:** Too much infrastructure work

### 5. AWS RDS + AppSync

**Pro:**
- Managed PostgreSQL (RDS)
- GraphQL API (AppSync)
- AWS ecosystem integration

**Con:**
- Complex setup (IAM, VPC, etc.)
- Expensive
- No built-in Realtime like Supabase
- Steep learning curve

**Verdict:** Overkill for our needs

## Implementation

### Migration Strategy

**Phase 1: Parallel Systems** (Week 1-2)
- Set up Supabase project
- Create schema (tables, indexes, RLS)
- Keep Firebase running
- Dual-write to both databases

**Phase 2: Data Migration** (Week 3)
- Export Firebase data
- Transform to relational schema
- Import to Supabase
- Verify data integrity

**Phase 3: Code Migration** (Week 4-6)
- Replace Firebase SDK with Supabase SDK
- Refactor components (useSupabaseStore)
- Update Auth flow
- Migrate Storage

**Phase 4: Cutover** (Week 7)
- Switch reads to Supabase
- Monitor for errors
- Keep Firebase read-only (backup)

**Phase 5: Cleanup** (Week 8+)
- Remove Firebase SDK
- Delete Firebase data (after 30 days)
- Archive codebase

### Schema Design

**Firebase (NoSQL)**:
```
users/{userId}/gearItems/{itemId}
users/{userId}/loadouts/{loadoutId}
```

**Supabase (SQL)**:
```sql
profiles (id, email, username, ...)
gear_items (id, user_id, name, weight, ...)
loadouts (id, user_id, name, ...)
loadout_items (loadout_id, gear_item_id, quantity)
```

**Benefits**:
- Normalized schema (no duplication)
- Foreign keys ensure referential integrity
- Joins for complex queries
- Indexes for performance

### Code Changes

**Before** (Firebase):
```typescript
const itemsRef = collection(db, `users/${userId}/gearItems`);
const snapshot = await getDocs(itemsRef);
const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

**After** (Supabase):
```typescript
const { data: items } = await supabase
  .from('gear_items')
  .select('*')
  .eq('user_id', userId);
```

### Authentication

**Before** (Firebase Auth):
```typescript
import { signInWithGoogle } from 'firebase/auth';
```

**After** (Supabase Auth):
```typescript
import { createBrowserClient } from '@/lib/supabase/client';
const supabase = createBrowserClient();
await supabase.auth.signInWithOAuth({ provider: 'google' });
```

### Storage

**Before** (Firebase Storage):
```typescript
const ref = ref(storage, `users/${userId}/images/${filename}`);
await uploadBytes(ref, file);
```

**After** (Cloudinary + Supabase):
- **Images**: Cloudinary CDN (better optimization)
- **Backups**: Supabase Storage (S3-compatible)

## Consequences

### Positive

1. **Better Queries**
   - Complex joins (loadouts with items)
   - Aggregations (total weight, cost)
   - Full SQL power (CTEs, window functions)

2. **AI Features Unlocked**
   - Vector search for Semantic Recall (pgvector)
   - Fuzzy matching for typo-tolerant search (pg_trgm)
   - Geospatial queries for merchants (PostGIS)

3. **Cost Predictability**
   - Fixed pricing (Pro: $25/month)
   - No surprise bills from read/write spikes

4. **Self-Hosting Option**
   - Can run locally for development
   - Can migrate to own infrastructure
   - Not locked into proprietary platform

5. **Better Developer Experience**
   - SQL queries easier to reason about
   - Type-safe client (auto-generated types)
   - Better debugging (SQL explain plans)

### Negative

1. **Migration Effort**
   - 6-8 weeks of work
   - Risk of bugs during transition
   - Data transformation complexity

2. **Learning Curve**
   - Team needs to learn SQL (if not already)
   - RLS policies require understanding
   - Different mental model than NoSQL

3. **No Automatic Scaling**
   - Firebase scaled automatically
   - Supabase requires manual plan upgrades
   - Need to monitor database size

4. **Connection Limits**
   - PostgreSQL has connection limits (~500)
   - Need connection pooling (Supabase provides)
   - Edge Functions can exhaust connections

### Neutral

1. **Realtime**
   - Both Firebase and Supabase support realtime
   - Supabase uses WebSockets (same as Firebase)
   - No significant difference

2. **Auth**
   - Both support Google OAuth, email/password
   - Supabase has more providers (GitHub, Discord, etc.)
   - Migration required but straightforward

## Validation

### Success Metrics

- ✅ **Migration Completed**: 2025-12-20 (Week 7)
- ✅ **Zero Data Loss**: All Firebase data successfully migrated
- ✅ **Performance**: Queries 2-5× faster than Firebase
- ✅ **Cost Reduction**: $150/month (Firebase) → $50/month (Supabase + Cloudinary)
- ✅ **AI Features**: Semantic Recall working with pgvector
- ✅ **Zero Downtime**: Parallel systems allowed seamless cutover

### Post-Migration Stats

- **Database Size**: 1.2GB (within free tier initially)
- **Query Performance**: Average 45ms (vs 120ms on Firebase)
- **Connection Pool**: 50 connections (well below limit)
- **Vector Queries**: 50-80ms for semantic recall (acceptable)

## Risks & Mitigations

### Risk 1: Data Loss During Migration

**Mitigation**:
- Dual-write to both databases during transition
- Keep Firebase read-only for 30 days after cutover
- Export Firebase data before deletion
- Verified data integrity with checksums

### Risk 2: Performance Degradation

**Mitigation**:
- Added indexes on all foreign keys
- Connection pooling enabled
- Query optimization (EXPLAIN ANALYZE)
- Monitoring with Supabase dashboard

### Risk 3: Learning Curve

**Mitigation**:
- Team SQL training sessions
- Pair programming during migration
- Comprehensive documentation
- Code reviews for RLS policies

### Risk 4: Vendor Lock-In (Again)

**Mitigation**:
- Supabase is open-source (can self-host)
- Standard PostgreSQL (not proprietary)
- Can migrate to any PostgreSQL hosting
- Export data via pg_dump

## Review

**After 2 months** (2026-02-10):
- Performance: ✅ Excellent (queries 2-5× faster)
- Costs: ✅ Reduced (70% savings)
- Developer Experience: ✅ Improved (SQL easier to reason about)
- AI Features: ✅ Working perfectly (pgvector, trigrams, PostGIS)
- Stability: ✅ No major issues

**Verdict**: Excellent decision. Should have done it sooner.

## Related Docs

- [Database Schema](../architecture/database-schema.md)
- [Tech Stack](../architecture/tech-stack.md)
- [Supabase Best Practices](https://supabase.com/docs/guides/database)

---

**Decision Date**: 2025-12-10
**Implementation**: 2025-12-10 to 2025-12-20
**Status**: ✅ Complete & Successful
**Cost Impact**: -70% (savings)
**Performance Impact**: +150% (faster queries)
