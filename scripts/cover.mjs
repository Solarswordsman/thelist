#!/usr/bin/env node
/**
 * Normalise a cover image for an item.
 *
 *   npm run cover -- <id> <url-or-file-or-steam:appid> [--fit cover|contain] [--position <p>]
 *
 * Writes public/covers/<id>.webp at a fixed 640x360 (16:9) so every card in
 * the list is the same shape regardless of the source's aspect ratio.
 *
 *   --fit cover     (default) crop to fill
 *   --fit contain   letterbox on the site background instead of cropping
 *   --position      where to crop from when fit=cover: centre (default), top,
 *                   bottom, left, right, entropy, attention
 *
 * Sources, best first:
 *   steam:<appid>   pulls the 1232x706 store capsule via Steam's public
 *                   store-browse API (no key needed). Find the appid with
 *                   https://store.steampowered.com/api/storesearch/?term=<name>&cc=us&l=en
 *   Nintendo store  assets.nintendo.com `.../store/software/...` URL from the
 *                   page's og:image, with the transform prefix swapped for
 *                   `f_auto/q_auto/w_1200` (1200x675)
 *   press kits      publisher key art, any size
 *   Wikipedia       infobox art via Special:FilePath (low-res; last resort)
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

const STEAM_ASSETS = ["main_capsule_2x", "main_capsule", "header_2x", "header"];

/** Resolve steam:<appid> to the largest store capsule URL Steam serves. */
async function steamCapsuleUrl(appid) {
	const input = { ids: [{ appid: Number(appid) }], context: { language: "english", country_code: "US" }, data_request: { include_assets: true } };
	const url = `https://api.steampowered.com/IStoreBrowseService/GetItems/v1?input_json=${encodeURIComponent(JSON.stringify(input))}`;
	const res = await fetch(url, { headers: { "user-agent": UA } });
	if (!res.ok) throw new Error(`steam GetItems: HTTP ${res.status}`);
	const item = (await res.json()).response?.store_items?.[0];
	const assets = item?.assets;
	if (!assets) throw new Error(`steam appid ${appid}: no store assets (wrong id, or not a store app?)`);
	const key = STEAM_ASSETS.find((k) => assets[k]);
	if (!key) throw new Error(`steam appid ${appid}: no capsule asset found`);
	console.log(`steam: ${item.name} -> ${key}`);
	return `https://shared.akamai.steamstatic.com/store_item_assets/${assets.asset_url_format.replace("${FILENAME}", assets[key])}`;
}

async function load(src) {
	const steam = /^steam:(\d+)$/.exec(src);
	if (steam) src = await steamCapsuleUrl(steam[1]);
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
