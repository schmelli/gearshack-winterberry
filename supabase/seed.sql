-- Seed data for price tracking feature
-- Feature: 050-price-tracking
-- Date: 2025-12-17
-- Purpose: Test partner retailers for development

-- Insert test partner retailers
INSERT INTO partner_retailers (
  name,
  website_url,
  logo_url,
  api_key,
  api_secret_hash,
  status,
  rate_limit_per_hour,
  rate_limit_per_day
) VALUES
(
  'Bergfreunde.de',
  'https://www.bergfreunde.de',
  'https://www.bergfreunde.de/logo.png',
  'test_bergfreunde_api_key_12345',
  'hashed_secret_bergfreunde',
  'active',
  100,
  1000
),
(
  'Bergzeit.de',
  'https://www.bergzeit.de',
  'https://www.bergzeit.de/logo.png',
  'test_bergzeit_api_key_67890',
  'hashed_secret_bergzeit',
  'active',
  100,
  1000
);
