import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    cli: "src/cli.ts",
    index: "src/index.ts",
  },
  clean: true,
  dts: true,
  format: "esm",
  platform: "node",
  sourcemap: true,
  target: "node20",
});
