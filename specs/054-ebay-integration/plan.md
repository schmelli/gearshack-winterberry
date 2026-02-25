# Implementation Plan: eBay Platform Notifications Integration

**Branch**: `054-ebay-integration` | **Date**: 2026-01-16 | **Status**: Draft
**Input**: eBay Platform Notifications documentation + existing merchant integration context

---

## Summary

Implement eBay Platform Notifications webhook endpoint to receive real-time updates about orders, items, and seller activities from eBay. This enables GearShack to:
- Track price changes for watched items
- Sync inventory status from connected eBay seller accounts
- Receive order notifications for merchant integrations
- Build a foundation for future eBay seller tools

**Technical Approach**:
- Create dedicated webhook endpoint at `/api/webhooks/ebay/notifications`
- Implement SOAP/XML parsing with `fast-xml-parser`
- Validate eBay signatures using MD5 hash verification
- Store notifications in PostgreSQL for processing
- Use async processing pattern (webhook acknowledges immediately, processes later)

---

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), @supabase/supabase-js, fast-xml-parser, crypto (Node.js built-in)
**Storage**: PostgreSQL (Supabase) - new `ebay_notifications` table
**Testing**: Jest for unit tests, manual eBay sandbox testing
**Target Platform**: Server-side API route only (no client components)
**Project Type**: Webhook receiver (stateless, async processing)
**Performance Goals**: < 500ms response time (eBay requires quick acknowledgment)
**Constraints**: eBay expects HTTP 200 within 10 seconds; timestamp validation +/- 10 minutes

---

## Existing eBay Integration Analysis

### Current State

The project already has eBay-related code for **price search** (Feature 057):

| File | Purpose |
|------|---------|
| `/app/api/ebay-search/route.ts` | Search eBay listings via SerpApi |
| `/types/ebay.ts` | eBay listing types (`EbayListing`, `EbaySiteConfig`, etc.) |
| `/lib/constants/ebay-sites.ts` | Locale-to-eBay-site mapping (DE, US, UK, etc.) |
| `/lib/external-apis/ebay-filter.ts` | Smart filtering for search results |
| `/supabase/migrations/20260113000002_create_ebay_price_cache.sql` | Cache table for search results |

### Key Insight

The existing integration uses **SerpApi** as a proxy for eBay search, not the official eBay API. For Platform Notifications, we need direct eBay API integration with proper authentication.

### Merchant Integration Context

Feature 053 (Merchant Integration) has established patterns for:
- B2B seller onboarding (`merchants` table)
- Product catalogs (`merchant_catalog_items`)
- Location-based services (PostGIS)
- Admin approval workflows

eBay Platform Notifications can extend this for eBay-connected merchants.

---

## eBay Platform Notifications Overview

### How It Works

1. **Registration**: GearShack registers a webhook URL with eBay Developer Portal
2. **Subscription**: Choose notification types (order, item, feedback, etc.)
3. **Delivery**: eBay sends SOAP/XML POST requests to webhook
4. **Acknowledgment**: Webhook returns HTTP 200 immediately
5. **Processing**: Background job processes queued notifications

### SOAP Message Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header>
    <ebl:RequesterCredentials xmlns:ebl="urn:ebay:apis:eBLBaseComponents">
      <ebl:NotificationSignature>BASE64_MD5_SIGNATURE</ebl:NotificationSignature>
    </ebl:RequesterCredentials>
  </soapenv:Header>
  <soapenv:Body>
    <GetItemResponse xmlns="urn:ebay:apis:eBLBaseComponents">
      <Timestamp>2026-01-16T10:30:00.000Z</Timestamp>
      <Ack>Success</Ack>
      <NotificationEventName>ItemSold</NotificationEventName>
      <RecipientUserID>seller_username</RecipientUserID>
      <Item>
        <ItemID>123456789012</ItemID>
        <Title>MSR Hubba Hubba NX 2-Person Tent</Title>
        ...
      </Item>
    </GetItemResponse>
  </soapenv:Body>
</soapenv:Envelope>
```

### Signature Validation

eBay signs each notification with MD5:

```
Signature = Base64(MD5(Timestamp + DevId + AppId + CertId))
```

Where:
- `Timestamp`: From SOAP body (e.g., `2026-01-16T10:30:00.000Z`)
- `DevId`, `AppId`, `CertId`: From eBay developer credentials

**Validation Requirements**:
- Compute expected signature and compare with `NotificationSignature` header
- Reject requests with timestamp drift > 10 minutes from server time
- Log failed validations for security monitoring

---

## Notification Types to Support

### Phase 1 (MVP)

| Event | Purpose | Use Case |
|-------|---------|----------|
| `ItemSold` | Item sold notification | Track merchant inventory changes |
| `ItemEnded` | Listing ended | Update tracked prices |
| `ItemRevised` | Item updated | Sync price/description changes |
| `FixedPriceTransaction` | BIN purchase | Order tracking for merchants |
| `AuctionCheckoutComplete` | Auction paid | Order tracking |

### Phase 2 (Future)

| Event | Purpose | Use Case |
|-------|---------|----------|
| `Feedback` | Buyer/seller feedback | Merchant reputation |
| `ItemOutOfStock` | Inventory depleted | Wishlist availability |
| `BestOffer` | Offer received | Interactive selling |
| `EndOfAuction` | Auction complete | Final price tracking |
| `BidReceived` | New bid | Auction monitoring |

---

## Database Schema

### New Table: `ebay_notifications`

```sql
-- Migration: 20260116000001_ebay_notifications.sql

CREATE TABLE IF NOT EXISTS ebay_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- eBay identifiers
  notification_id TEXT NOT NULL UNIQUE,
  event_name TEXT NOT NULL,
  item_id TEXT,
  order_id TEXT,
  seller_user_id TEXT,
  buyer_user_id TEXT,

  -- Raw data
  raw_xml TEXT NOT NULL,
  parsed_payload JSONB NOT NULL,

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'ignored')),
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,

  -- Linking to GearShack entities (nullable)
  merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
  gear_item_id UUID REFERENCES gear_items(id) ON DELETE SET NULL,

  -- Metadata
  ebay_timestamp TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ebay_notifications_status ON ebay_notifications(status);
CREATE INDEX idx_ebay_notifications_event ON ebay_notifications(event_name);
CREATE INDEX idx_ebay_notifications_item ON ebay_notifications(item_id);
CREATE INDEX idx_ebay_notifications_seller ON ebay_notifications(seller_user_id);
CREATE INDEX idx_ebay_notifications_pending
  ON ebay_notifications(received_at) WHERE status = 'pending';

-- RLS (service role only - no user access)
ALTER TABLE ebay_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ebay_notifications_service_only"
ON ebay_notifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

### New Table: `ebay_credentials` (for connected sellers)

```sql
-- Stores eBay API credentials for connected merchant accounts

CREATE TABLE IF NOT EXISTS ebay_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,

  -- eBay seller identity
  ebay_user_id TEXT NOT NULL,

  -- OAuth tokens (encrypted in application layer)
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,

  -- Notification preferences
  subscribed_events TEXT[] DEFAULT ARRAY['ItemSold', 'ItemEnded', 'ItemRevised'],

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ebay_credentials_unique UNIQUE (merchant_id)
);

CREATE INDEX idx_ebay_credentials_seller ON ebay_credentials(ebay_user_id);
```

---

## API Route Design

### Route: `/api/webhooks/ebay/notifications`

**Path**: `/app/api/webhooks/ebay/notifications/route.ts`

```typescript
/**
 * eBay Platform Notifications Webhook
 *
 * Feature: 054-ebay-integration
 *
 * Receives SOAP/XML notifications from eBay Platform Notifications API.
 * Validates signature, stores raw notification, returns 200 immediately.
 *
 * @see https://developer.ebay.com/Devzone/guides/features-guide/default.html
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { parseEbayNotification, validateEbaySignature } from '@/lib/ebay/notification-parser';
import { z } from 'zod';

// eBay expects response within 10 seconds
export const maxDuration = 10;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Read raw XML body
    const rawXml = await request.text();

    if (!rawXml || rawXml.length === 0) {
      console.error('[eBay Webhook] Empty request body');
      return new NextResponse('Bad Request', { status: 400 });
    }

    // 2. Parse SOAP envelope
    const parsed = parseEbayNotification(rawXml);

    if (!parsed.success) {
      console.error('[eBay Webhook] Parse failed:', parsed.error);
      return new NextResponse('Bad Request', { status: 400 });
    }

    // 3. Validate signature
    const signatureValid = validateEbaySignature({
      providedSignature: parsed.signature,
      timestamp: parsed.timestamp,
      devId: process.env.EBAY_DEV_ID!,
      appId: process.env.EBAY_APP_ID!,
      certId: process.env.EBAY_CERT_ID!,
    });

    if (!signatureValid.valid) {
      console.error('[eBay Webhook] Signature validation failed:', signatureValid.reason);
      // Return 200 to prevent eBay retry spam, but log security event
      await logSecurityEvent('invalid_ebay_signature', { reason: signatureValid.reason });
      return new NextResponse('OK', { status: 200 });
    }

    // 4. Validate timestamp (must be within 10 minutes)
    const timestampValid = validateTimestamp(parsed.timestamp);

    if (!timestampValid) {
      console.warn('[eBay Webhook] Timestamp out of range:', parsed.timestamp);
      // Still return 200 to prevent retries
      return new NextResponse('OK', { status: 200 });
    }

    // 5. Store notification for async processing
    const supabase = createServiceRoleClient();

    const { error: insertError } = await supabase
      .from('ebay_notifications')
      .insert({
        notification_id: parsed.notificationId,
        event_name: parsed.eventName,
        item_id: parsed.itemId,
        order_id: parsed.orderId,
        seller_user_id: parsed.sellerUserId,
        buyer_user_id: parsed.buyerUserId,
        raw_xml: rawXml,
        parsed_payload: parsed.payload,
        ebay_timestamp: parsed.timestamp,
        status: 'pending',
      });

    if (insertError) {
      // Log but still return 200 (eBay will retry if we return error)
      console.error('[eBay Webhook] Insert failed:', insertError);
    }

    // 6. Return success immediately (process async later)
    const duration = Date.now() - startTime;
    console.log(`[eBay Webhook] ${parsed.eventName} received in ${duration}ms`);

    return new NextResponse('OK', { status: 200 });

  } catch (error) {
    console.error('[eBay Webhook] Unexpected error:', error);
    // Return 200 to prevent infinite retries
    return new NextResponse('OK', { status: 200 });
  }
}

// eBay may also send HEAD requests for endpoint verification
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
```

---

## Library Design

### `/lib/ebay/notification-parser.ts`

```typescript
/**
 * eBay SOAP Notification Parser
 *
 * Parses eBay Platform Notification SOAP/XML messages and validates signatures.
 */

import { XMLParser } from 'fast-xml-parser';
import { createHash } from 'crypto';

// Type definitions
export interface ParsedNotification {
  success: true;
  notificationId: string;
  eventName: string;
  timestamp: string;
  signature: string;
  itemId?: string;
  orderId?: string;
  sellerUserId?: string;
  buyerUserId?: string;
  payload: Record<string, unknown>;
}

export interface ParseError {
  success: false;
  error: string;
}

export type ParseResult = ParsedNotification | ParseError;

export interface SignatureValidation {
  valid: boolean;
  reason?: string;
}

export interface SignatureInput {
  providedSignature: string;
  timestamp: string;
  devId: string;
  appId: string;
  certId: string;
}

// XML Parser configuration
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: true,
  trimValues: true,
  removeNSPrefix: true, // Remove namespace prefixes
});

/**
 * Parse eBay SOAP notification XML
 */
export function parseEbayNotification(xml: string): ParseResult {
  try {
    const parsed = parser.parse(xml);

    // Navigate SOAP structure
    const envelope = parsed.Envelope || parsed['soapenv:Envelope'];
    if (!envelope) {
      return { success: false, error: 'Missing SOAP Envelope' };
    }

    const header = envelope.Header || envelope['soapenv:Header'];
    const body = envelope.Body || envelope['soapenv:Body'];

    if (!body) {
      return { success: false, error: 'Missing SOAP Body' };
    }

    // Extract signature from header
    const credentials = header?.RequesterCredentials ||
                       header?.['ebl:RequesterCredentials'];
    const signature = credentials?.NotificationSignature ||
                     credentials?.['ebl:NotificationSignature'] || '';

    // Find the response element (GetItemResponse, etc.)
    const responseKey = Object.keys(body).find(k => k.endsWith('Response'));
    if (!responseKey) {
      return { success: false, error: 'Missing Response element in SOAP Body' };
    }

    const response = body[responseKey];

    // Extract common fields
    const eventName = response.NotificationEventName || '';
    const timestamp = response.Timestamp || '';
    const item = response.Item || {};
    const transaction = response.Transaction || response.TransactionArray?.Transaction || {};

    return {
      success: true,
      notificationId: `${eventName}-${timestamp}-${item.ItemID || 'unknown'}`,
      eventName,
      timestamp,
      signature,
      itemId: item.ItemID?.toString(),
      orderId: transaction.OrderID?.toString() || transaction.OrderLineItemID?.toString(),
      sellerUserId: response.RecipientUserID || item.Seller?.UserID,
      buyerUserId: transaction.Buyer?.UserID,
      payload: response,
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parse error',
    };
  }
}

/**
 * Validate eBay notification signature
 *
 * Signature = Base64(MD5(Timestamp + DevId + AppId + CertId))
 */
export function validateEbaySignature(input: SignatureInput): SignatureValidation {
  const { providedSignature, timestamp, devId, appId, certId } = input;

  // Check required credentials
  if (!devId || !appId || !certId) {
    return { valid: false, reason: 'Missing eBay API credentials' };
  }

  if (!providedSignature) {
    return { valid: false, reason: 'No signature provided' };
  }

  if (!timestamp) {
    return { valid: false, reason: 'No timestamp provided' };
  }

  // Compute expected signature
  const signatureString = timestamp + devId + appId + certId;
  const md5Hash = createHash('md5').update(signatureString).digest('base64');

  // Compare (timing-safe comparison would be ideal)
  if (md5Hash === providedSignature) {
    return { valid: true };
  }

  return { valid: false, reason: 'Signature mismatch' };
}

/**
 * Validate timestamp is within acceptable range (+/- 10 minutes)
 */
export function validateTimestamp(timestamp: string): boolean {
  try {
    const notificationTime = new Date(timestamp).getTime();
    const serverTime = Date.now();
    const diffMinutes = Math.abs(serverTime - notificationTime) / (1000 * 60);

    return diffMinutes <= 10;
  } catch {
    return false;
  }
}
```

---

## Environment Variables

Add to `.env.local` and Vercel environment:

```bash
# eBay API Credentials (from eBay Developer Portal)
EBAY_DEV_ID=your_dev_id
EBAY_APP_ID=your_app_id
EBAY_CERT_ID=your_cert_id

# eBay OAuth (for connected seller accounts)
EBAY_CLIENT_ID=your_client_id
EBAY_CLIENT_SECRET=your_client_secret

# Webhook security
EBAY_WEBHOOK_SECRET=random_secret_for_additional_validation

# Environment: sandbox or production
EBAY_ENVIRONMENT=sandbox
```

---

## Async Processing (Cron Job)

### Route: `/api/cron/process-ebay-notifications`

Runs every 5 minutes to process pending notifications:

```typescript
/**
 * Cron job: Process pending eBay notifications
 *
 * Feature: 054-ebay-integration
 * Schedule: Every 5 minutes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  // Fetch pending notifications (limit 100 per run)
  const { data: notifications, error } = await supabase
    .from('ebay_notifications')
    .select('*')
    .eq('status', 'pending')
    .order('received_at', { ascending: true })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let processed = 0;
  let failed = 0;

  for (const notification of notifications) {
    try {
      // Mark as processing
      await supabase
        .from('ebay_notifications')
        .update({ status: 'processing' })
        .eq('id', notification.id);

      // Process based on event type
      await processNotification(notification, supabase);

      // Mark as completed
      await supabase
        .from('ebay_notifications')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('id', notification.id);

      processed++;

    } catch (err) {
      // Mark as failed
      await supabase
        .from('ebay_notifications')
        .update({
          status: 'failed',
          error_message: err instanceof Error ? err.message : 'Unknown error',
          retry_count: notification.retry_count + 1
        })
        .eq('id', notification.id);

      failed++;
    }
  }

  return NextResponse.json({
    success: true,
    processed,
    failed,
    total: notifications.length
  });
}

async function processNotification(
  notification: any,
  supabase: any
): Promise<void> {
  const { event_name, parsed_payload, item_id, seller_user_id } = notification;

  switch (event_name) {
    case 'ItemSold':
    case 'FixedPriceTransaction':
      await handleItemSold(notification, supabase);
      break;

    case 'ItemEnded':
      await handleItemEnded(notification, supabase);
      break;

    case 'ItemRevised':
      await handleItemRevised(notification, supabase);
      break;

    default:
      console.log(`[eBay Cron] Unhandled event: ${event_name}`);
  }
}

// Handler implementations would go in separate modules
async function handleItemSold(notification: any, supabase: any): Promise<void> {
  // Update merchant inventory, track sales, etc.
}

async function handleItemEnded(notification: any, supabase: any): Promise<void> {
  // Update price tracking, mark items as unavailable
}

async function handleItemRevised(notification: any, supabase: any): Promise<void> {
  // Sync price changes to tracked items
}
```

---

## Project Structure

```text
app/
├── api/
│   ├── webhooks/
│   │   └── ebay/
│   │       └── notifications/
│   │           └── route.ts           # Webhook endpoint
│   └── cron/
│       └── process-ebay-notifications/
│           └── route.ts               # Async processor

lib/
├── ebay/
│   ├── notification-parser.ts         # SOAP/XML parsing
│   ├── signature-validator.ts         # MD5 signature validation
│   ├── notification-handlers/         # Event-specific handlers
│   │   ├── item-sold.ts
│   │   ├── item-ended.ts
│   │   └── item-revised.ts
│   └── types.ts                       # eBay-specific types

types/
└── ebay-notifications.ts              # Notification types

supabase/
└── migrations/
    ├── 20260116000001_ebay_notifications.sql
    └── 20260116000002_ebay_credentials.sql
```

---

## Security Considerations

### 1. Signature Validation (Critical)

- Always validate MD5 signature before processing
- Use timing-safe comparison to prevent timing attacks
- Log all signature validation failures with IP and payload hash

### 2. Timestamp Validation

- Reject notifications older than 10 minutes (replay protection)
- Use server time, not client time
- Log clock drift warnings

### 3. Rate Limiting

- eBay may send high volume during sales events
- Implement per-seller rate limiting if needed
- Queue overflow protection (cap pending notifications)

### 4. Secret Management

- Store eBay credentials in environment variables only
- Never log raw credentials
- Encrypt OAuth tokens in database (AES-256)

### 5. Logging Best Practices

- Log event type and item ID (not full payload)
- Mask sensitive data (buyer info, prices)
- Retain logs for 90 days for debugging

---

## Testing Strategy

### Unit Tests

```typescript
// __tests__/lib/ebay/notification-parser.test.ts

describe('parseEbayNotification', () => {
  it('parses ItemSold notification correctly');
  it('extracts signature from SOAP header');
  it('handles missing optional fields gracefully');
  it('returns error for malformed XML');
});

describe('validateEbaySignature', () => {
  it('validates correct signature');
  it('rejects incorrect signature');
  it('handles missing credentials');
});
```

### Integration Tests

- Use eBay Sandbox environment for end-to-end testing
- Manual trigger of test notifications from eBay Developer Portal
- Verify database storage and cron processing

---

## Implementation Phases

### Phase 1: Foundation (MVP)

1. Create `ebay_notifications` table
2. Implement webhook endpoint with signature validation
3. Store raw notifications for processing
4. Basic logging and error handling

**Deliverables**: Working webhook that stores validated notifications

### Phase 2: Processing

1. Create cron job for async processing
2. Implement `ItemSold` handler (merchant inventory)
3. Implement `ItemEnded` handler (price tracking)
4. Implement `ItemRevised` handler (price updates)

**Deliverables**: Notifications flow through to GearShack entities

### Phase 3: Merchant Integration

1. Create `ebay_credentials` table
2. Implement OAuth flow for connecting eBay seller accounts
3. Link notifications to specific merchants
4. Admin panel for managing eBay connections

**Deliverables**: Merchants can connect eBay accounts

### Phase 4: Advanced Features

1. Real-time inventory sync
2. Sales analytics dashboard
3. Automated price alerts based on eBay data
4. Bulk listing import from eBay

**Deliverables**: Full eBay seller integration

---

## Dependencies

### Required NPM Packages

```bash
npm install fast-xml-parser
# crypto is built into Node.js - no install needed
```

### Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `EBAY_DEV_ID` | eBay Developer ID | Yes |
| `EBAY_APP_ID` | eBay Application ID | Yes |
| `EBAY_CERT_ID` | eBay Certificate ID | Yes |
| `EBAY_CLIENT_ID` | OAuth Client ID | Phase 3 |
| `EBAY_CLIENT_SECRET` | OAuth Client Secret | Phase 3 |
| `EBAY_ENVIRONMENT` | sandbox/production | Yes |

### Required eBay Developer Setup

1. Create eBay Developer account
2. Create application in Developer Portal
3. Configure Platform Notifications
4. Add webhook URL: `https://gearshack.app/api/webhooks/ebay/notifications`
5. Subscribe to notification events

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| eBay changes API format | Medium | High | Version check, graceful degradation |
| High notification volume | Medium | Medium | Queue limits, async processing |
| Signature validation issues | Low | High | Extensive logging, fallback checks |
| Webhook endpoint DDoS | Low | High | Rate limiting at edge (Vercel) |
| Clock sync issues | Low | Medium | 10-minute tolerance, NTP sync |

---

## Success Metrics

- Webhook uptime: 99.9%
- Average response time: < 500ms
- Notification processing success rate: > 98%
- Zero security incidents from invalid signatures

---

## Related Documentation

- [eBay Platform Notifications Guide](https://developer.ebay.com/Devzone/guides/features-guide/default.html)
- [eBay Trading API Reference](https://developer.ebay.com/Devzone/XML/docs/Reference/ebay/index.html)
- [Feature 053: Merchant Integration](../053-merchant-integration/spec.md)
- [Existing eBay Search Implementation](../../lib/external-apis/ebay-filter.ts)

---

## Open Questions

1. **Sandbox Testing**: Should we maintain separate sandbox credentials for development?
2. **Notification Retry**: How should we handle eBay's retry behavior for failed deliveries?
3. **Multi-tenant**: Should notifications be scoped per-merchant or global?
4. **OAuth Scope**: What eBay API scopes do we need for full seller integration?
5. **GDPR**: How long should we retain notification data (buyer info)?

---

## Next Steps

1. [ ] Create Supabase migration for `ebay_notifications` table
2. [ ] Implement `/api/webhooks/ebay/notifications` route
3. [ ] Add `fast-xml-parser` dependency
4. [ ] Create notification parser library
5. [ ] Set up eBay Developer account and obtain credentials
6. [ ] Configure eBay sandbox for testing
7. [ ] Write unit tests for parser and validator
8. [ ] Deploy to staging and test with eBay sandbox
