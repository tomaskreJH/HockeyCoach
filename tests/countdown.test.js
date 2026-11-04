// Testy odpočtů (domain/countdown.js): hodiny HH:MM:SS a text „zbývá“ do termínu přihlášení. Čisté funkce bez DOM.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {clockText, DAY_MS, leftText} from "../src/domain/countdown.js";

// ===== Konstanty =====
const H = 36e5, M = 6e4;                                         // hodina a minuta v ms

// ===== Testy =====
test("clockText: HH:MM:SS, přes 24 hodin se hodiny nezalamují, záporný čas = nuly", () => {
  assert.equal(clockText(0), "00:00:00");
  assert.equal(clockText(3661000), "01:01:01");
  assert.equal(clockText(25 * H), "25:00:00");
  assert.equal(clockText(DAY_MS - 1000), "23:59:59");
  assert.equal(clockText(-5000), "00:00:00");
});

test("leftText: dny se správným tvarem, 1–2 dny s hodinami, pod den hodiny a minuty, pod hodinu minuty", () => {
  assert.equal(leftText(7 * DAY_MS + 5 * H), "7 dní");
  assert.equal(leftText(3 * DAY_MS + H), "3 dny");
  assert.equal(leftText(DAY_MS + 5 * H), "1 den 5 h");
  assert.equal(leftText(2 * DAY_MS), "2 dny");
  assert.equal(leftText(5 * H + 12 * M), "5 h 12 min");
  assert.equal(leftText(2 * H), "2 h");
  assert.equal(leftText(41 * M + 20000), "41 min");
  assert.equal(leftText(30000), "méně než minuta");
  assert.equal(leftText(-1), "méně než minuta");
});
