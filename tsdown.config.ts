import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: "esm",
  platform: "node",
  fixedExtension: false,
  dts: true,
  clean: true,
  copy: [{ from: "src/assets", to: "dist" }],
});
