#!/bin/bash

# Generate PWA icons from base image using ImageMagick
# Usage: ./generate-pwa-icons.sh

BASE_ICON="public/icons/base-icon.png"
ICONS_DIR="public/icons"

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick is not installed. Installing..."
    # Try to install ImageMagick
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y imagemagick
    elif command -v brew &> /dev/null; then
        brew install imagemagick
    else
        echo "Please install ImageMagick manually"
        exit 1
    fi
fi

# Icon sizes for PWA
SIZES=(72 96 128 144 152 192 384 512)

echo "Generating PWA icons from $BASE_ICON..."

# Create icons directory if it doesn't exist
mkdir -p "$ICONS_DIR"

# Generate icons for each size
for size in "${SIZES[@]}"; do
    output_file="$ICONS_DIR/icon-${size}x${size}.png"
    echo "Generating ${size}x${size} icon..."
    
    # Create icon with proper background and padding
    convert "$BASE_ICON" \
        -resize "${size}x${size}" \
        -background "#10B981" \
        -gravity center \
        -extent "${size}x${size}" \
        "$output_file"
    
    if [ $? -eq 0 ]; then
        echo "✓ Created $output_file"
    else
        echo "✗ Failed to create $output_file"
    fi
done

echo "PWA icon generation complete!"
echo "Generated icons:"
ls -la "$ICONS_DIR"/*.png
