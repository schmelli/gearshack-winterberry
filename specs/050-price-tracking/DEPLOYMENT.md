# Production Deployment Checklist
## Feature: 050-price-tracking
## Date: 2025-12-17

This document outlines the manual steps required to deploy the price tracking feature to production.

## Prerequisites

- [ ] All migrations tested in staging environment
- [ ] Environment variables configured in staging
- [ ] Test partner API integrations in staging
- [ ] Verify SerpApi account has sufficient credits

## T080: Apply Migrations to Production Supabase

### Steps:

1. Log into Supabase Dashboard (https://supabase.com)
2. Select your production project
3. Navigate to **SQL Editor**
4. Apply migrations in order:
   ```
   specs/050-price-tracking/migrations/20251217000001_enable_extensions.sql
   specs/050-price-tracking/migrations/20251217000002_price_tracking_tables.sql
   specs/050-price-tracking/migrations/20251217000003_partner_retailers.sql
   specs/050-price-tracking/migrations/20251217000004_alerts.sql
   specs/050-price-tracking/migrations/20251217000005_views_functions.sql
   specs/050-price-tracking/migrations/20251217000006_rls_policies.sql
   ```
5. Verify each migration executes successfully
6. Check table creation:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name LIKE 'price_%' OR table_name LIKE 'alert_%' OR table_name = 'partner_retailers';
   ```

### Verification:

- [ ] All 7 tables created (price_tracking, price_results, price_history, price_alerts, alert_preferences, partner_retailers, personal_offers)
- [ ] community_availability view exists
- [ ] fuzzy_search_products function exists
- [ ] RLS policies applied to all tables

---

## T081: Configure Production Environment Variables

### Vercel Dashboard:

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add the following variables:

#### Required Variables:
```
SERPAPI_KEY=<your_production_serpapi_key>
CRON_SECRET=<generate_strong_random_string>
PARTNER_API_SECRET=<generate_strong_random_string>
```

#### Optional Variables:
```
PRICE_TRACKING_ENABLED=true
MAX_CONCURRENT_SEARCHES=5
CACHE_TTL_HOURS=6
```

### Verification:

- [ ] All environment variables set
- [ ] CRON_SECRET is unique and secure (32+ characters)
- [ ] PARTNER_API_SECRET is unique and secure (32+ characters)
- [ ] SerpApi key tested and has sufficient credits

---

## T082: Set Up Vercel Cron Job

### Steps:

1. The cron job is already configured in `vercel.json`
2. Verify the configuration:
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/check-prices",
         "schedule": "0 2 * * *"
       }
     ]
   }
   ```
3. Deploy to production (cron jobs auto-register on deploy)
4. Verify cron job in Vercel Dashboard:
   - Go to **Settings** → **Cron Jobs**
   - Confirm `/api/cron/check-prices` is listed
   - Schedule: `0 2 * * *` (Daily at 2 AM UTC)

### Testing:

Manually trigger the cron job to verify it works:
```bash
curl -X GET https://your-domain.com/api/cron/check-prices \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Verification:

- [ ] Cron job appears in Vercel dashboard
- [ ] Manual test completes successfully
- [ ] Check logs for any errors
- [ ] Verify price_history table is populated after first run

---

## T083: Seed Partner Retailers

### Steps:

1. Open Supabase SQL Editor
2. Run the seed script:
   ```sql
   -- Load from file: specs/050-price-tracking/migrations/seed.sql
   ```
3. Verify seed data:
   ```sql
   SELECT id, name, is_active FROM partner_retailers;
   ```

### Expected Results:

5 partner retailers should be inserted:
- Bergzeit.de
- Bergfreunde.de
- Globetrotter.de
- Outdoor-Broker.de
- Decathlon.de

### Verification:

- [ ] All 5 retailers inserted
- [ ] All retailers marked as `is_active = true`
- [ ] Logo URLs and website URLs are valid

---

## T084: Enable Supabase Realtime Subscriptions

### Steps:

1. Go to Supabase Dashboard
2. Navigate to **Database** → **Replication**
3. Enable replication for the following tables:
   - `price_tracking`
   - `price_alerts`
   - `personal_offers`

4. Verify Realtime is enabled for your project:
   - Go to **Settings** → **API**
   - Check "Enable Realtime" is ON

### Verification:

- [ ] Realtime enabled for project
- [ ] price_tracking table has replication enabled
- [ ] price_alerts table has replication enabled
- [ ] personal_offers table has replication enabled

### Optional: Test Realtime Subscription

```javascript
const supabase = createClient();

const subscription = supabase
  .channel('price_alerts')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'price_alerts' },
    (payload) => {
      console.log('New price alert:', payload);
    }
  )
  .subscribe();
```

---

## T085: Set Up Monitoring Dashboards

### Metrics to Monitor:

#### 1. SerpApi Usage
- **Metric**: API calls per day
- **Threshold**: Alert if approaching monthly quota
- **Tools**: SerpApi Dashboard (https://serpapi.com/dashboard)

#### 2. Cron Job Success Rate
- **Metric**: Successful vs failed executions
- **Threshold**: Alert if failure rate > 5%
- **Tools**: Vercel Logs, Vercel Analytics

#### 3. Alert Delivery Rate
- **Metric**: Alerts sent vs alerts created
- **Threshold**: Alert if delivery rate < 95%
- **Query**:
  ```sql
  SELECT
    COUNT(*) as total_alerts,
    COUNT(CASE WHEN push_sent_at IS NOT NULL OR email_sent_at IS NOT NULL THEN 1 END) as delivered,
    COUNT(CASE WHEN push_sent_at IS NOT NULL OR email_sent_at IS NOT NULL THEN 1 END) * 100.0 / COUNT(*) as delivery_rate
  FROM price_alerts
  WHERE created_at > NOW() - INTERVAL '24 hours';
  ```

### Recommended Monitoring Tools:

1. **Vercel Analytics**: Built-in monitoring for functions and cron jobs
2. **Supabase Logs**: Query database logs and slow queries
3. **Sentry** (optional): Error tracking and performance monitoring
4. **Better Uptime** (optional): External cron job monitoring

### Dashboard Setup:

Create a monitoring dashboard with:

1. **SerpApi Usage Panel**
   - Current usage vs quota
   - Average calls per day
   - Projected quota exhaustion date

2. **Price Tracking Panel**
   - Active tracking items
   - Daily price checks completed
   - Average results per search

3. **Alert Performance Panel**
   - Alerts created (24h, 7d, 30d)
   - Delivery success rate
   - Alert types breakdown

4. **Error Tracking Panel**
   - Failed API calls
   - Cron job failures
   - Database errors

### Verification:

- [ ] SerpApi usage monitoring active
- [ ] Cron job execution logs reviewed
- [ ] Alert delivery metrics tracked
- [ ] Error tracking configured
- [ ] Dashboard accessible to team

---

## Post-Deployment Verification

After completing all deployment steps, verify the complete flow:

1. **User Flow Test**:
   - [ ] User can enable tracking for a wishlist item
   - [ ] Price search returns results within 30 seconds
   - [ ] Results are cached for 6 hours
   - [ ] User receives price drop alert (test with manual price change)

2. **Partner API Test**:
   - [ ] Partner can submit personal offer via API
   - [ ] Offer appears in user's wishlist view
   - [ ] User receives offer notification
   - [ ] Offer expires after valid_until timestamp

3. **Cron Job Test**:
   - [ ] Wait 24 hours after deployment
   - [ ] Verify cron job executed at 2 AM UTC
   - [ ] Check price_history table for new entries
   - [ ] Verify alerts sent for price drops

4. **Performance Test**:
   - [ ] Load test with 100 concurrent price searches
   - [ ] Verify rate limiting works (5 concurrent max)
   - [ ] Check database query performance
   - [ ] Verify cache hit rate > 60% after 24 hours

---

## Rollback Plan

If issues arise in production:

1. **Disable Feature Flag** (if implemented):
   ```
   PRICE_TRACKING_ENABLED=false
   ```

2. **Disable Cron Job**:
   - Remove cron job from Vercel dashboard
   - Or update CRON_SECRET to invalidate current jobs

3. **Revert Migrations** (last resort):
   ```sql
   DROP TABLE IF EXISTS personal_offers CASCADE;
   DROP TABLE IF EXISTS price_alerts CASCADE;
   DROP TABLE IF EXISTS alert_preferences CASCADE;
   DROP TABLE IF EXISTS partner_retailers CASCADE;
   DROP TABLE IF EXISTS price_history CASCADE;
   DROP TABLE IF EXISTS price_results CASCADE;
   DROP TABLE IF EXISTS price_tracking CASCADE;
   DROP VIEW IF EXISTS community_availability;
   DROP FUNCTION IF EXISTS fuzzy_search_products;
   ```

---

## Support Contact

For deployment issues, contact:
- **SerpApi Support**: support@serpapi.com
- **Vercel Support**: Vercel dashboard → Help
- **Supabase Support**: Supabase dashboard → Support

---

## Sign-off

- [ ] All deployment steps completed
- [ ] Verification tests passed
- [ ] Monitoring dashboards active
- [ ] Team notified of new feature launch

**Deployed by**: _________________
**Date**: _________________
**Production URL**: _________________
