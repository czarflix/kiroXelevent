import path from "node:path";
import type { NextConfig } from "next";

const workspaceRoot = path.resolve(process.cwd(), "../..");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingRoot: workspaceRoot,
  transpilePackages: ["@voicegauntlet/core"],
  turbopack: {
    root: workspaceRoot
  },
  typedRoutes: true
};

export default nextConfig;
