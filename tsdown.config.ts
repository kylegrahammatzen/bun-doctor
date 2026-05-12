import { defineConfig } from "tsdown";
import packageJson from "./package.json" with { type: "json" };

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
  define: {
    "process.env.VERSION": JSON.stringify(packageJson.version),
  },
});
