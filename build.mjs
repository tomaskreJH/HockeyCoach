// Sestavení: spojí moduly z src/ do jednoho souboru dist/hokej-samostatny.html,
// který jde otevřít dvojklikem (bez serveru). Spuštění: npm install && npm run build
import {build} from "esbuild";
import fs from "node:fs";

const out = await build({entryPoints: ["src/main.js"], bundle: true, format: "iife", target: "es2020", minify: true, write: false});
const js = out.outputFiles[0].text.replace(/<\/script>/gi, "<\\/script>");
const css = fs.readFileSync("styles/main.css", "utf8");
let html = fs.readFileSync("index.html", "utf8");
html = html
  .replace('<link rel="stylesheet" href="styles/main.css">', () => `<style>${css}</style>`)
  .replace('<script type="module" src="src/main.js"></script>', () => `<script>${js}</script>`)
  .replace('<link rel="manifest" href="manifest.webmanifest">', "")
  .replace('<link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="icon-192.png">', "");
fs.mkdirSync("dist", {recursive: true});
fs.writeFileSync("dist/hokej-samostatny.html", html);
console.log("dist/hokej-samostatny.html", (html.length / 1024).toFixed(0) + " kB");
