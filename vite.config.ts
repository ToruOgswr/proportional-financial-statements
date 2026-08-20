import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // GitHub Pagesのプロジェクト配下でも相対パスで読み込めるようにする。
  base: "./",
  plugins: [react()],
});
