import { createApiApp } from "./server/_core/app";

// Vercel zero-config Express entry point. Static assets (the Vite-built SPA)
// are served separately via vercel.json's outputDirectory, not by this app.
export default createApiApp();
