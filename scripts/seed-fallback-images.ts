/**
 * Seed Fallback Images to Cloudinary
 * Feature: 048-ai-loadout-image-gen
 *
 * This script uploads curated fallback images to Cloudinary
 * Run: npx tsx scripts/seed-fallback-images.ts
 */

import { config } from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
config({ path: '.env.local' });

// =============================================================================
// Configuration
// =============================================================================

// Support both NEXT_PUBLIC_ and non-prefixed env vars
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const FALLBACK_IMAGES_DIR = path.join(process.cwd(), 'public', 'fallback-images');
const CLOUDINARY_FOLDER = 'gearshack/fallbacks';

// =============================================================================
// Image Definitions (expected files in public/fallback-images/)
// =============================================================================

const EXPECTED_IMAGES = [
  // Hiking
  'hiking-spring.jpg',
  'hiking-summer.jpg',
  'hiking-fall.jpg',
  'hiking-winter.jpg',

  // Camping
  'camping-spring.jpg',
  'camping-summer.jpg',
  'camping-fall.jpg',
  'camping-winter.jpg',

  // Climbing
  'climbing-spring.jpg',
  'climbing-summer.jpg',
  'climbing-fall.jpg',
  'climbing-winter.jpg',

  // Skiing
  'skiing-winter-1.jpg',
  'skiing-winter-2.jpg',

  // Backpacking
  'backpacking-spring.jpg',
  'backpacking-summer.jpg',
  'backpacking-fall.jpg',
  'backpacking-winter.jpg',

  // Generic
  'generic-spring.jpg',
  'generic-summer.jpg',
  'generic-fall.jpg',
  'generic-winter.jpg',
  'generic-outdoor-1.jpg',
  'generic-outdoor-2.jpg',
];

// =============================================================================
// Upload Functions
// =============================================================================

async function uploadImage(filename: string): Promise<void> {
  const filepath = path.join(FALLBACK_IMAGES_DIR, filename);

  // Check if file exists
  if (!fs.existsSync(filepath)) {
    console.warn(`⚠️  Skipping ${filename} (file not found)`);
    return;
  }

  try {
    console.log(`📤 Uploading ${filename}...`);

    const result = await cloudinary.uploader.upload(filepath, {
      folder: CLOUDINARY_FOLDER,
      public_id: filename.replace('.jpg', ''), // Remove extension
      overwrite: true, // Replace if exists
      resource_type: 'image',
      transformation: [
        {
          width: 1920,
          height: 1080,
          crop: 'fill',
          quality: 'auto:best',
          fetch_format: 'auto',
        },
      ],
    });

    console.log(`✅ Uploaded ${filename} -> ${result.secure_url}`);
  } catch (error) {
    console.error(`❌ Failed to upload ${filename}:`, error);
  }
}

async function seedAllImages(): Promise<void> {
  console.log('🌱 Starting fallback image seeding...\n');

  // Check if directory exists
  if (!fs.existsSync(FALLBACK_IMAGES_DIR)) {
    console.error(`❌ Directory not found: ${FALLBACK_IMAGES_DIR}`);
    console.log('\n📝 Instructions:');
    console.log('1. Create directory: public/fallback-images/');
    console.log('2. Download high-quality outdoor images from Unsplash/Pexels');
    console.log('3. Name them according to the convention (e.g., hiking-spring.jpg)');
    console.log('4. Run this script again\n');
    process.exit(1);
  }

  // Upload all images
  for (const filename of EXPECTED_IMAGES) {
    await uploadImage(filename);
  }

  console.log('\n✨ Seeding complete!');
  console.log(`📊 Total images expected: ${EXPECTED_IMAGES.length}`);
}

// =============================================================================
// Validation
// =============================================================================

function validateConfig(): boolean {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;

  if (!cloudName) {
    console.error('❌ Missing CLOUDINARY_CLOUD_NAME or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME');
    return false;
  }
  if (!process.env.CLOUDINARY_API_KEY) {
    console.error('❌ Missing CLOUDINARY_API_KEY');
    return false;
  }
  if (!process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ Missing CLOUDINARY_API_SECRET');
    return false;
  }
  return true;
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('🚀 Fallback Image Seeding Script');
  console.log('================================\n');

  // Validate configuration
  if (!validateConfig()) {
    console.error('\n❌ Configuration validation failed');
    console.log('Please ensure all Cloudinary environment variables are set in .env.local\n');
    process.exit(1);
  }

  console.log('✅ Configuration validated');
  console.log(`📁 Source directory: ${FALLBACK_IMAGES_DIR}`);
  console.log(`☁️  Cloudinary folder: ${CLOUDINARY_FOLDER}\n`);

  // Run seeding
  await seedAllImages();
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

export { seedAllImages, uploadImage };
