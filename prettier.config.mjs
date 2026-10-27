import * as sortImports from "@ianvs/prettier-plugin-sort-imports"

// The VS Code Prettier extension rewrites string plugins into "file:///..." URL strings, which
// prettier-plugin-tailwindcss can't match against its compat list, so its parser silently replaces the
// sort-imports one and imports stop being sorted on save. Passing a named plugin object keeps it
// recognisable in both the editor and the CLI. `toJSON` stops `JSON.stringify(options)` (Prettier CLI
// debug log) from tripping the plugin's lazy `ember-template-tag` / `oxc` parser getters.
const sortImportsPlugin = {
  ...sortImports.default,
  name: "@ianvs/prettier-plugin-sort-imports",
  toJSON: () => "@ianvs/prettier-plugin-sort-imports"
}

/**
 * @see https://prettier.io/docs/en/configuration.html
 * @type {import("prettier").Config}
 */
export default {
  bracketSameLine: true,
  endOfLine: "lf",
  htmlWhitespaceSensitivity: "ignore",
  importOrder: [
    "<BUILTIN_MODULES>",
    "",
    "<THIRD_PARTY_MODULES>",
    "",
    "^(?!(.*)[.]css$)(@/)(.*)$",
    "",
    "^(?!(.*)[.]css$)[./](.*)$",
    "",
    ".css$"
  ],
  importOrderTypeScriptVersion: "5.0.0",
  jsxSingleQuote: true,
  plugins: [sortImportsPlugin, "prettier-plugin-tailwindcss"],
  printWidth: 90,
  proseWrap: "always",
  quoteProps: "consistent",
  semi: false,
  singleQuote: false,
  tailwindFunctions: ["cn", "cls", "clsx"],
  trailingComma: "none"
}
