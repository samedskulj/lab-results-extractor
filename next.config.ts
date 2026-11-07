import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The API reads the sample documents from disk; ship them with the route in production builds.
  outputFileTracingIncludes: { "/api/[[...route]]": ["./data/samples/**"] },
};

export default nextConfig;
