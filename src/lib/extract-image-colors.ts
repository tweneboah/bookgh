"use client";

import { getPalette } from "colorthief";

/**
 * Load an image from a File (object URL) and extract dominant colors.
 * Returns up to 5 hex colors, suitable for primary/accent and swatches.
 */
export async function extractColorsFromFile(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      try {
        const palette = await getPalette(img, { colorCount: 5 });
        URL.revokeObjectURL(url);
        if (!palette || palette.length === 0) {
          resolve([]);
          return;
        }
        const hexColors = palette.map((c) => c.hex());
        resolve(hexColors);
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.crossOrigin = "anonymous";
    img.src = url;
  });
}

/**
 * Load an image from a URL and extract dominant colors.
 * Use when the URL allows CORS (e.g. same origin or CORS-enabled CDN).
 */
export async function extractColorsFromUrl(imageUrl: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = async () => {
      try {
        const palette = await getPalette(img, { colorCount: 5 });
        if (!palette || palette.length === 0) {
          resolve([]);
          return;
        }
        resolve(palette.map((c) => c.hex()));
      } catch (e) {
        reject(e);
      }
    };

    img.onerror = () => reject(new Error("Failed to load image"));

    img.crossOrigin = "anonymous";
    img.src = imageUrl;
  });
}
