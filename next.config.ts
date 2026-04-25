import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverActions: {
    bodySizeLimit: "10mb"
  },
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas", "tesseract.js", "tesseract.js-core"]
};

export default nextConfig;
