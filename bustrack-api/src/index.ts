import express from "express";
import { createApp } from "./application";

// Vercel's Express adapter detects this file, imports Express and serves the
// default-exported app as a single Node.js Function.
const app = createApp();
void express; // Preserve the direct Express import for Vercel's framework detector.

export default app;
