import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  agentRules: false,

  cacheComponents: true,
  cacheHandlers: {
    remote: require.resolve("./src/libs/cache-handlers/redis-handler.js")
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "4mb"
    }
  },

  httpAgentOptions: {
    keepAlive: false
  },

  images: {
    qualities: [25, 50, 75, 100],
    localPatterns: [
      { pathname: "/api/art/**", search: "" },
      { pathname: "/static/images/**", search: "" }
    ]
  },

  logging: {
    fetches: {
      fullUrl: true,
      hmrRefreshes: true
    },
    incomingRequests: true
  },

  partialPrefetching: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false
}

export default nextConfig
