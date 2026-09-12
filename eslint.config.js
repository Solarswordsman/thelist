import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";

export default tseslint.config(
	{ ignores: ["dist", "coverage"] },
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ["**/*.{js,mjs,ts}"],
		languageOptions: {
			globals: { ...globals.browser },
		},
		plugins: {
			"@stylistic": stylistic,
		},
		rules: {
			// House style: tabs for indentation (see .editorconfig).
			"@stylistic/indent": ["error", "tab"],
			"@typescript-eslint/no-unused-vars": ["error", { varsIgnorePattern: "^_" }],
		},
	},
	{
		// Config files and scripts run in Node.
		files: ["*.config.{js,ts}", "eslint.config.js", "scripts/**/*.mjs"],
		languageOptions: { globals: { ...globals.node } },
	},
);
