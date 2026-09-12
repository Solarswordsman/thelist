#!/usr/bin/env node
/**
 * Normalise a cover image for an item.
 *
 *   npm run cover -- <id> <url-or-file> [--fit cover|contain] [--position <p>]
 *
 * Writes public/covers/<id>.webp at a fixed 640x360 (16:9) so every card in
 * the list is the same shape regardless of the source's aspect ratio.
 *
 *   --fit cover     (default) crop to fill
 *   --fit contain   letterbox on the site background instead of cropping
 *   --position      where to crop from when fit=cover: centre (default), top,
 *                   bottom, left, right, entropy, attention
 *
 * Good sources: Nintendo store (assets.nintendo.com ... `/store/software/...`
 * with `w_1200` in the transform path), Steam `header.jpg` / `library_hero`,
 * publisher press kits, Wikipedia infobox art (low-res; last resort).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const WIDTH = 640;
const HEIGHT = 360;
const BG = "#101116";
const UA = "thelist-cover-fetch/0.1 (+https://thelist.jlamb.sh)";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
	const args = { fit: "cover", position: "centre" };
	const positional = [];
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--fit") args.fit = argv[++i];
		else if (a === "--position") args.position = argv[++i];
		else if (a.startsWith("--")) throw new Error(`unknown flag ${a}`);
		else positional.push(a);
	}
	[args.id, args.src] = positional;
	if (!args.id || !args.src) throw new Error("usage: npm run cover -- <id> <url-or-file> [--fit cover|contain] [--position <p>]");
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(args.id)) throw new Error(`id "${args.id}" must be kebab-case`);
	if (!["cover", "contain"].includes(args.fit)) throw new Error("--fit must be cover or contain");
	return args;
}

async function load(src) {
	if (/^https?:\/\//.test(src)) {
		const res = await fetch(src, { headers: { "user-agent": UA } });
		if (!res.ok) throw new Error(`fetch ${src}: HTTP ${res.status}`);
		const type = res.headers.get("content-type") ?? "";
		if (!type.startsWith("image/")) throw new Error(`fetch ${src}: not an image (${type})`);
		return Buffer.from(await res.arrayBuffer());
	}
	return readFile(path.resolve(src));
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const input = await load(args.src);
	const meta = await sharp(input).metadata();
	const out = path.join(root, "public", "covers", `${args.id}.webp`);
	await mkdir(path.dirname(out), { recursive: true });
	const buf = await sharp(input)
		.rotate()
		.resize(WIDTH, HEIGHT, { fit: args.fit, position: args.position, background: BG, kernel: "lanczos3" })
		.webp({ quality: 82 })
		.toBuffer();
	await writeFile(out, buf);
	const rel = path.relative(root, out);
	console.log(`${rel}  ${meta.width}x${meta.height} ${meta.format} -> ${WIDTH}x${HEIGHT} webp (${(buf.length / 1024).toFixed(0)} KiB, fit=${args.fit})`);
	if (meta.width < WIDTH) console.warn(`warning: source is only ${meta.width}px wide; it was upscaled. Look for a bigger one if it's soft.`);
	console.log(`set "cover": "/covers/${args.id}.webp" on the item in data/items.json`);
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
