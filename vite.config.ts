/// <reference types="vitest/config" />
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	// Served from the site root on Netlify; no sub-path needed.
	base: "/",
	test: {
		// Pure modules (dates, filters, validate) run under node; DOM tests opt in
		// with a `// @vitest-environment jsdom` header.
		environment: "node",
	},
});
