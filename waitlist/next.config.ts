import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // When deploying to a custom domain (e.g. nuvio.app), basePath is empty.
  // For GitHub Pages project sites (mathantunes.github.io/nuvio), set
  // BASE_PATH=/nuvio in the workflow environment.
  basePath: process.env.BASE_PATH ?? "",
  images: {
    unoptimized: true, // required for static export
  },
};

export default nextConfig;
