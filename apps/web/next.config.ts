import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@tripflow/ui", "@tripflow/core", "@tripflow/api-client"],
};

export default nextConfig;
