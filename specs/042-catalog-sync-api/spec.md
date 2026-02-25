# Feature Specification: Global Gear Catalog & Sync API

**Feature Branch**: `042-catalog-sync-api`
**Created**: 2025-12-10
**Status**: Draft
**Input**: User description: "Global Gear Catalog & Sync API (CQRS Pattern) - Mirror master data from Memgraph into Supabase for fast autocomplete and hybrid search"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fuzzy Brand/Product Autocomplete (Priority: P1)

As a user editing gear items, I want instant autocomplete suggestions for Brands and Products when typing in the Gear Editor, even if I make typos (e.g., typing "Hileberg" instead of "Hilleberg"), so I can quickly find and select the correct brand or product without exact spelling.

**Why this priority**: This is the core user-facing functionality. Fast, typo-tolerant autocomplete directly improves the gear entry experience and data quality by helping users select from a canonical catalog.

**Independent Test**: Can be fully tested by typing partial/misspelled brand names in the Gear Editor and verifying suggestions appear within acceptable latency. Delivers immediate value by reducing manual typing and improving data consistency.

**Acceptance Scenarios**:

1. **Given** I am in the Gear Editor brand field, **When** I type "Hile", **Then** I see "Hilleberg" in the autocomplete suggestions within 200ms
2. **Given** I am in the Gear Editor brand field, **When** I type "Hileberg" (misspelled), **Then** I still see "Hilleberg" as a top suggestion (fuzzy match)
3. **Given** I am in the Gear Editor product name field, **When** I type "neo air", **Then** I see matching products like "NeoAir XLite" in suggestions
4. **Given** the catalog contains 50,000+ products, **When** I type a search query, **Then** results appear within 200ms

---

### User Story 2 - Semantic Product Search (Priority: P2)

As a user, I want to find products that are semantically similar (e.g., searching "Ultralight Winter Tent") even if the exact keywords don't match in the product names, so I can discover relevant gear based on concepts rather than exact text.

**Why this priority**: Semantic search enhances discoverability beyond exact matches, but requires P1's infrastructure (catalog tables) to be in place first. Adds significant value for users who don't know exact product names.

**Independent Test**: Can be tested by searching conceptual terms and verifying semantically related products appear in results, even without exact keyword matches.

**Acceptance Scenarios**:

1. **Given** I search for "ultralight winter shelter", **When** results are returned, **Then** products like "X-Mid 2 Pro" or "Hornet Elite" appear even though "winter shelter" isn't in their names
2. **Given** I search for "lightweight cooking system", **When** results are returned, **Then** stove and cookware products appear based on semantic similarity
3. **Given** a product has embeddings stored, **When** I perform a semantic search, **Then** results are ranked by semantic relevance score

---

### User Story 3 - Catalog Sync API for External Scripts (Priority: P3)

As a developer/admin, I want a secure API endpoint (`/api/sync-catalog`) that my external Python scripts (GearGraph) can call to push/upsert new catalog data into Supabase automatically, so the catalog stays synchronized with the master data source without manual intervention.

**Why this priority**: This is an administrative/backend capability that enables P1 and P2 to have data. It's essential infrastructure but not directly user-facing. Can be tested independently of frontend features.

**Independent Test**: Can be tested by making authenticated POST requests to the sync endpoint with sample brand/product data and verifying records appear in the database.

**Acceptance Scenarios**:

1. **Given** I have a valid admin secret/service key, **When** I POST a brand payload to `/api/sync-catalog/brands`, **Then** the brand is upserted in `catalog_brands` table
2. **Given** I have a valid admin secret/service key, **When** I POST a product payload with embeddings to `/api/sync-catalog/items`, **Then** the product is upserted in `catalog_items` table with vector data
3. **Given** I do NOT have valid credentials, **When** I attempt to POST to the sync endpoint, **Then** I receive a 401 Unauthorized response
4. **Given** I POST a product that already exists (same external ID), **When** the request completes, **Then** the existing record is updated (upsert behavior)

---

### Edge Cases

- What happens when a user types very fast (debouncing)?
- How does the system handle special characters in search queries?
- What happens when the sync API receives malformed JSON?
- How does the system handle duplicate brand/product entries with slight variations?
- What happens when vector embeddings are missing for semantic search?
- How does the system behave when database connection is slow/unavailable?

## Requirements *(mandatory)*

### Functional Requirements

**Database Infrastructure:**

- **FR-001**: System MUST enable the `pg_trgm` PostgreSQL extension for trigram-based fuzzy text matching
- **FR-002**: System MUST enable the `pgvector` PostgreSQL extension for storing and querying semantic embeddings
- **FR-003**: System MUST provide a `catalog_brands` table storing brand master data (name, logo URL, website, external ID)
- **FR-004**: System MUST provide a `catalog_items` table storing product master data (name, brand reference, category, description, external ID, embedding vector)
- **FR-005**: System MUST create appropriate indices for fast text search (trigram index on name fields)
- **FR-006**: System MUST create appropriate indices for fast vector search (ivfflat or hnsw index on embedding columns)

**Access Control:**

- **FR-007**: System MUST allow all authenticated users READ access to catalog tables
- **FR-008**: System MUST prevent normal users from INSERT/UPDATE/DELETE on catalog tables (read-only for non-admins)
- **FR-009**: System MUST allow only authenticated admin requests (via Supabase Service Role Key) to write to catalog tables

**Sync API:**

- **FR-010**: System MUST provide an API endpoint to accept brand data payloads for upsert operations
- **FR-011**: System MUST provide an API endpoint to accept product data payloads including embedding vectors for upsert operations
- **FR-012**: System MUST validate incoming payloads against expected schema before processing
- **FR-013**: System MUST return appropriate error responses for invalid payloads (400), unauthorized requests (401), and server errors (500)
- **FR-014**: System MUST support batch operations for syncing multiple records in a single request

**Search Functionality:**

- **FR-015**: System MUST provide fuzzy text search on brand names using trigram similarity, returning up to 5 results
- **FR-016**: System MUST provide fuzzy text search on product names using trigram similarity, returning up to 5 results
- **FR-017**: System MUST provide semantic/vector search on products using stored embeddings
- **FR-018**: System MUST support combined text + semantic hybrid search with configurable weighting

### Key Entities

- **CatalogBrand**: Represents a gear manufacturer/brand. Key attributes: unique identifier, name, logo URL, website URL, external source ID (for sync deduplication). One brand has many products.
- **CatalogItem**: Represents a specific gear product. Key attributes: unique identifier, name, brand reference, category, description, specifications summary, external source ID, embedding vector (for semantic search). Each product belongs to one brand.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users receive autocomplete suggestions within 200ms of typing (p95 latency)
- **SC-002**: Fuzzy search correctly matches typos with up to 2 character errors (e.g., "Hileberg" matches "Hilleberg")
- **SC-003**: Semantic search returns relevant results for conceptual queries where exact keywords don't match in at least 80% of test cases
- **SC-004**: Sync API successfully processes batch uploads of 1000+ records without timeout
- **SC-005**: Catalog tables support 100,000+ products while maintaining sub-200ms query performance
- **SC-006**: Unauthorized sync requests are rejected 100% of the time
- **SC-007**: Users can search and find products from the catalog during gear item creation/editing

## Clarifications

### Session 2025-12-10

- Q: What embedding vector dimension should be used? → A: 1536 dimensions (industry standard)
- Q: What authentication method for sync API? → A: Supabase Service Role Key
- Q: How many autocomplete results to return? → A: 5 results (minimal, fastest)

## Assumptions

- The external Memgraph database and GearGraph Python scripts are maintained separately and will call this sync API
- Embeddings are pre-computed by the external system (GearGraph) before syncing; this system only stores and queries them
- The embedding dimension is **1536 dimensions** (industry standard, compatible with OpenAI text-embedding-3-small and similar models)
- Supabase project has the ability to enable required PostgreSQL extensions (`pg_trgm`, `pgvector`)
- Supabase Service Role Key is used for sync API authentication (stored in environment variables, bypasses RLS for admin operations)

## Out of Scope

- Computing embeddings within this system (handled by external GearGraph)
- Managing the Memgraph master database
- User-generated catalog contributions (this is read-only catalog data from authoritative source)
- Full-text search with stemming/linguistic analysis (trigram fuzzy search is sufficient for MVP)
