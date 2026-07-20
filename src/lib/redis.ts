import { Redis } from "@upstash/redis";

// Upstash client for x402 nonce/replay + settlement state. Required in
// production (serverless has no shared memory). Keys are namespaced `expiri:*`
// so this can safely share a database with other projects.
export const redis = Redis.fromEnv();
