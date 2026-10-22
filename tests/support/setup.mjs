// Příprava prostředí testů (spouští se před každým testovým souborem: node --import ./tests/support/setup.mjs).
// Moduly aplikace počítají s prohlížečem; testy proto dostanou minimální zástupce document, window, localStorage a sessionStorage
// a Firebase SDK se nahradí zástupcem (hooks.mjs). Nepotřebuje žádný balíček z npm (jen Node 22+).
import {register} from "node:module";

// ===== Zástupce prvku DOM (přijme jakýkoli zápis, nic nevykresluje) =====
const el = () => ({style: {}, dataset: {}, innerHTML: "", textContent: "", appendChild() {}, remove() {}, click() {}, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, classList: {add() {}, remove() {}, toggle() {}, contains: () => false}});

// ===== Zástupce úložiště prohlížeče (paměť) =====
const mem = () => { const m = new Map(); return {getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear()}; };

// ===== Globální objekty =====
globalThis.document = {getElementById: () => el(), querySelector: () => el(), querySelectorAll: () => [], createElement: () => el(), addEventListener() {}, body: el()};
globalThis.window = globalThis;
globalThis.localStorage = mem();
globalThis.sessionStorage = mem();

// ===== Zavaděč: Firebase SDK ze zástupce =====
register("./hooks.mjs", import.meta.url);
