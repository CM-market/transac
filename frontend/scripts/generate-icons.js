#!/usr/bin/env node

/**
 * Generate PWA icons from SVG base
 * This script creates PNG icons in various sizes for PWA compatibility
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Icon sizes needed for PWA
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Create simple colored squares as placeholders
// In a real app, you'd use a proper SVG to PNG converter like sharp or puppeteer
function generatePlaceholderIcon(size) {
  // This creates a simple data URL for a colored square
  // In production, you'd want to use proper icon generation tools
  const canvas = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#10B981;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#grad)"/>
    <text x="50%" y="50%" text-anchor="middle" dy="0.35em" fill="white" 
          font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold">T</text>
  </svg>`;
  
  return canvas;
}

// Create icons directory
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate placeholder icons
ICON_SIZES.forEach(size => {
  const svgContent = generatePlaceholderIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(iconsDir, filename);
  
  fs.writeFileSync(filepath, svgContent);
  console.log(`Generated ${filename}`);
});

// Create a simple PNG placeholder using data URL
// This is a basic approach - in production use proper image generation
const createPngPlaceholder = (size) => {
  const svgContent = generatePlaceholderIcon(size);
  const base64 = Buffer.from(svgContent).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
};

// Create a simple HTML file to convert SVGs to PNGs manually
const converterHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Icon Converter</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .icon-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
    .icon-item { text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
    canvas { border: 1px solid #ccc; }
  </style>
</head>
<body>
  <h1>PWA Icon Generator</h1>
  <p>Right-click on each canvas and "Save image as" to download PNG files.</p>
  <div class="icon-grid">
    ${ICON_SIZES.map(size => `
      <div class="icon-item">
        <h3>${size}x${size}</h3>
        <canvas id="canvas-${size}" width="${size}" height="${size}"></canvas>
        <br><br>
        <button onclick="downloadIcon(${size})">Download PNG</button>
      </div>
    `).join('')}
  </div>

  <script>
    ${ICON_SIZES.map(size => `
      // Generate ${size}x${size} icon
      const canvas${size} = document.getElementById('canvas-${size}');
      const ctx${size} = canvas${size}.getContext('2d');
      
      // Create gradient
      const gradient${size} = ctx${size}.createLinearGradient(0, 0, ${size}, ${size});
      gradient${size}.addColorStop(0, '#10B981');
      gradient${size}.addColorStop(1, '#059669');
      
      // Draw background with rounded corners
      ctx${size}.fillStyle = gradient${size};
      ctx${size}.beginPath();
      ctx${size}.roundRect(0, 0, ${size}, ${size}, ${size * 0.15});
      ctx${size}.fill();
      
      // Draw text
      ctx${size}.fillStyle = 'white';
      ctx${size}.font = 'bold ${size * 0.4}px Arial';
      ctx${size}.textAlign = 'center';
      ctx${size}.textBaseline = 'middle';
      ctx${size}.fillText('T', ${size/2}, ${size/2});
    `).join('\n')}

    function downloadIcon(size) {
      const canvas = document.getElementById('canvas-' + size);
      const link = document.createElement('a');
      link.download = 'icon-' + size + 'x' + size + '.png';
      link.href = canvas.toDataURL();
      link.click();
    }

    // Add roundRect polyfill for older browsers
    if (!CanvasRenderingContext2D.prototype.roundRect) {
      CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        this.beginPath();
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();
      };
    }
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(iconsDir, 'converter.html'), converterHtml);
console.log('Created converter.html for manual PNG generation');

console.log('\nIcon generation complete!');
console.log('Open public/icons/converter.html in a browser to generate PNG files.');
console.log('Or use a proper tool like sharp, puppeteer, or online converters.');
