import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the Dockerfile's COPY .next/standalone step.
  output: "standalone",
};

export default nextConfig;
