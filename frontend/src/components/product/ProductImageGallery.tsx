import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const getImageUrl = (key: string) => key; // Placeholder

const ZoomableImage: React.FC<{ src: string; alt: string }> = ({
  src,
  alt,
}) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const { left, top, width, height } =
      containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setPosition({ x, y });
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden cursor-zoom-in rounded-lg"
      onMouseEnter={() => setIsZoomed(true)}
      onMouseLeave={() => setIsZoomed(false)}
      onMouseMove={handleMouseMove}
    >
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-transform duration-300 ease-out ${isZoomed ? "scale-150" : "scale-100"}`}
        style={{ transformOrigin: `${position.x}% ${position.y}%` }}
      />
    </div>
  );
};

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
}

const ProductImageGallery: React.FC<ProductImageGalleryProps> = ({
  images,
  productName,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % images.length);
  };

  const previousImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="space-y-4">
      <div className="relative aspect-square w-full bg-gray-100 rounded-xl overflow-hidden shadow-lg">
        <ZoomableImage
          src={getImageUrl(images[selectedImageIndex])}
          alt={productName}
        />
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full"
              onClick={previousImage}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full"
              onClick={nextImage}
            >
              <ChevronRight />
            </Button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-3">
          {images.map((image, index) => (
            <button
              key={index}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                selectedImageIndex === index
                  ? "border-cm-green ring-2 ring-cm-green/50"
                  : "border-gray-200 hover:border-cm-green"
              }`}
              onClick={() => setSelectedImageIndex(index)}
            >
              <img
                src={getImageUrl(image)}
                alt={`${productName} thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageGallery;
