#!/usr/bin/env node

/**
 * Create simple PNG icons using base64 encoded data
 * This creates minimal PNG files for PWA functionality
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Icon sizes needed for PWA
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Simple 1x1 pixel PNG in base64 (green color #10B981)
const GREEN_PIXEL_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA4nEKtAAAAABJRU5ErkJggg==";

// Create a simple colored PNG (this is a basic approach)
function createSimplePNG(size) {
  // This is a very basic approach - creates a 1x1 green pixel
  // In production, you'd use proper image generation libraries
  return Buffer.from(GREEN_PIXEL_PNG, "base64");
}

// Create icons directory
const iconsDir = path.join(__dirname, "../public/icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate simple PNG placeholders
ICON_SIZES.forEach((size) => {
  const pngData = createSimplePNG(size);
  const filename = `icon-${size}x${size}.png`;
  const filepath = path.join(iconsDir, filename);

  fs.writeFileSync(filepath, pngData);
  console.log(`Generated ${filename}`);
});

console.log("\nBasic PNG icons created!");
console.log("Note: These are minimal placeholder PNGs.");
console.log(
  "For production, use proper icon generation tools or design software.",
);
