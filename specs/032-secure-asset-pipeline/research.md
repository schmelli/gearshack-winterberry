# Research: Secure Asset Pipeline Sprint

**Feature**: 032-secure-asset-pipeline
**Date**: 2025-12-08

## Research Questions

### RQ1: How to identify Firebase Storage URLs vs external URLs?

**Investigation**:

Firebase Storage URLs follow predictable patterns:
- Production: `https://firebasestorage.googleapis.com/v0/b/...`
- Emulator: `http://localhost:9199/...`

**Decision**: Check if URL contains `firebasestorage.googleapis.com` to identify internal images
**Rationale**: Simple string check that covers all Firebase Storage URLs
**Alternatives**:
- Check for specific bucket name - More restrictive, but tied to configuration
- Use regex pattern - Overkill for this use case

---

### RQ2: How to determine file extension from content type?

**Investigation**:

Common image content types and their extensions:
- `image/jpeg` → `.jpg`
- `image/png` → `.png`
- `image/gif` → `.gif`
- `image/webp` → `.webp`
- `image/svg+xml` → `.svg`

**Decision**: Create a mapping function from MIME type to extension
**Rationale**: Ensures proper file naming for Firebase Storage
**Alternatives**:
- Extract from URL path - May be unreliable for CDN URLs
- Always use `.jpg` - Would lose format information

---

### RQ3: Where to put image import logic - hook or form submit handler?

**Investigation**:

Current save flow in useGearEditor.ts:
1. Form submits with form data
2. `handleSubmit` validates and converts to GearItem
3. Calls `addItem` or `updateItem` from store
4. Store handles Firestore write

**Decision**: Add image import logic in useGearEditor's submit handler, before store call
**Rationale**:
- Keeps logic in the hook (per constitution)
- Can set loading states appropriately
- Has access to form values and auth context

**Alternatives**:
- In store actions - Would require store to handle async image operations
- In MediaSection - Would violate Feature-Sliced Light (logic in component)

---

### RQ4: How to handle proxy security?

**Investigation**:

Security concerns for image proxy:
1. SSRF (Server-Side Request Forgery) - attacker could use proxy to access internal services
2. Resource exhaustion - large files or slow responses
3. Content type spoofing - attacker returns non-image content

**Decision**: Implement multiple security layers:
1. Validate URL is HTTP/HTTPS only (no file://, localhost, internal IPs)
2. Check content-type header starts with `image/`
3. Enforce file size limit (10MB)
4. Set reasonable timeout (30 seconds)

**Rationale**: Defense in depth without overcomplicating
**Alternatives**:
- Allow-list specific domains - Too restrictive for product image search
- Full URL sanitization - Complex and may break legitimate URLs

---

### RQ5: Best practices for Next.js API routes returning binary data?

**Investigation**:

Next.js 16+ App Router provides:
- `NextResponse` with blob/arrayBuffer support
- Automatic content-type handling
- Built-in streaming capabilities

**Decision**: Return blob directly with proxied content-type header
**Rationale**: Simplest approach that preserves original image format
**Alternatives**:
- Base64 encode - Increases payload size by ~33%
- Stream response - Adds complexity for small images

---

## Design Decisions

### DD-001: Proxy endpoint path

**Decision**: `/api/proxy-image` with GET method
**Rationale**: RESTful, descriptive, consistent with existing API patterns
**Trade-offs**: URL in query param requires encoding

### DD-002: Error handling strategy

**Decision**: Return appropriate HTTP status codes with JSON error body
- 400: Invalid/missing URL
- 403: Non-image content type
- 404: Source returned 404
- 500: Network/server errors

**Rationale**: Allows client to show appropriate error messages
**Trade-offs**: Requires client-side error mapping

### DD-003: Loading state management

**Decision**: Use existing `isSubmitting` state with additional toast messages
**Rationale**:
- Minimal UI changes
- User already expects loading during save
- Toast provides progress feedback

**Trade-offs**: No granular progress (download vs upload phases)

### DD-004: Internal URL detection

**Decision**: Check for `firebasestorage.googleapis.com` in URL
**Rationale**: Simple, reliable, covers all production Firebase Storage URLs
**Trade-offs**: Won't detect emulator URLs (acceptable for production)
