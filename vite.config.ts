import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: './' ist für GitHub Pages (Repo-Unterpfad) am robustesten
export default defineConfig({
  base: "./",
  plugins: [react()],
});