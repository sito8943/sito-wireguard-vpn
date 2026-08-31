import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import i18next from "eslint-plugin-i18next";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist", "src-tauri/target", "src-tauri/gen"]),
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      i18next.configs["flat/recommended"],
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      "i18next/no-literal-string": [
        "error",
        {
          mode: "jsx-only",
          callees: {
            exclude: [
              "i18n(ext)?",
              "t",
              "classNames",
              "require",
              "addEventListener",
              "removeEventListener",
              "postMessage",
              "getElementById",
              "dispatch",
              "commit",
              "includes",
              "indexOf",
              "endsWith",
              "startsWith",
            ],
          },
        },
      ],
    },
  },
  {
    // §14.1: los elementos crudos van envueltos en shared/components/elements,
    // que es el único sitio donde pueden aparecer.
    files: ["src/**/*.tsx"],
    ignores: ["src/shared/components/elements/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXOpeningElement[name.name=/^(button|input|select|textarea)$/]",
          message:
            "Usa las primitivas de shared/components/elements (Button, TextInput, TextArea…).",
        },
      ],
    },
  },
  {
    // §14.1: un feature nunca se acopla a @sito/ui; pasa por los envoltorios.
    files: ["src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@sito/ui",
              message:
                "Importa el envoltorio de shared/components (elements o patterns).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["*.{js,ts}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
  },
]);
