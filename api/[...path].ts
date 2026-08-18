import { createApiApp } from "../server/_core/app";

// Vercel /api directory convention: this catch-all file becomes a Function
// reachable at any /api/* sub-path (/api/trpc/*, /api/oauth/callback, etc).
// The Express app's own internal routing dispatches from there.
export default createApiApp();
