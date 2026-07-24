import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      next: {
        rootDir: "apps/web/",
      },
      react: {
        version: "19.2",
      },
    },
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  globalIgnores([
    "**/.next/**",
    "**/dist/**",
    "**/coverage/**",
    "**/node_modules/**",
    "**/drizzle/**",
    "**/playwright-report/**",
    "**/test-results/**",
    "**/next-env.d.ts",
  ]),
  {
    files: ["capabilities/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "@forge/db*",
            "@forge/integrations*",
            "@forge/agent-runtime*",
            "@forge/foundry*",
            "@forge/config*",
            "node:*",
            "openai",
            "pg",
            "fs",
            "child_process",
          ],
        },
      ],
      "no-restricted-globals": ["error", "process", "fetch", "require", "__dirname", "eval"],
    },
  },
]);
