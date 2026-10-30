import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["undici", "postgres"],
  poweredByHeader: false,
};
export default config;
