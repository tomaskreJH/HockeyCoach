// Testy 📅 exportu do kalendáře (domain/ical.js): přepočet pražského času na UTC, zalamování řádků, soukromí, zrušené a celodenní události,
// připomínky, SEQUENCE a výběr „Moje události“. Čisté funkce bez DOM.
// Struktura: Importy -> Pomocné funkce -> Čas a text -> Událost -> Kalendář -> Moje události.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {evDefaults} from "../src/domain/event-time.js";
import {ICS_ALARMS, ICS_MATCH_MIN, icsCalendar, icsEsc, icsEvent, icsFold, icsStamp, mineForCalendar, pragueToUtc} from "../src/domain/ical.js";

// ===== Pomocné funkce =====
const defs = evDefaults({});                                            // sraz tréninku 30, zápasu 60, délka tréninku 60
const NOW = Date.UTC(2026, 10, 4, 16, 43);                              // 4. 11. 2026 17:43 pražského času
const O = {defs, now: NOW};
const tr = (x = {}) => ({id: "e1", type: "training", title: "Trénink", date: "2026-11-10", time: "18:00", end: "19:00", meet: undefined, place: "", note: "", raw: {}, ...x});
const ma = (x = {}) => ({id: "m1", type: "match", title: "Zápas – Ostrava", date: "2026-11-14", time: "15:00", meet: undefined, place: "", note: "", raw: {}, ...x});
// Hodnota pole události (bez řádků uvnitř VALARM, aby se nepletl jejich DESCRIPTION)
const val = (L, k) => (L.slice(0, L.includes("BEGIN:VALARM") ? L.indexOf("BEGIN:VALARM") : L.length).find(l => l.startsWith(k + ":") || l.startsWith(k + ";")) || "").replace(/^[^:]+:/, "");

// ===== Čas a text =====
test("pragueToUtc: zima +1 h, léto +2 h, přechody na letní a zimní čas", () => {
  assert.equal(icsStamp(pragueToUtc("2026-11-04", "18:00")), "20261104T170000Z");
  assert.equal(icsStamp(pragueToUtc("2026-07-01", "18:00")), "20260701T160000Z");
  assert.equal(icsStamp(pragueToUtc("2026-03-28", "12:00")), "20260328T110000Z", "den před přechodem na letní čas");
  assert.equal(icsStamp(pragueToUtc("2026-03-29", "10:00")), "20260329T080000Z", "po přechodu na letní čas (29. 3. 2026)");
  assert.equal(icsStamp(pragueToUtc("2026-10-24", "10:00")), "20261024T080000Z", "před přechodem na zimní čas");
  assert.equal(icsStamp(pragueToUtc("2026-10-25", "10:00")), "20261025T090000Z", "po přechodu na zimní čas (25. 10. 2026)");
});

test("icsEsc: středník, čárka, zpětné lomítko a zalomení se escapují", () => {
  assert.equal(icsEsc("A, B; C\\D\nE"), "A\\, B\\; C\\\\D\\nE");
  assert.equal(icsEsc(null), "");
});

test("icsFold: řádek nejvýš 75 bajtů, znak s diakritikou se nerozdělí, po odstranění zalomení vznikne původní text", () => {
  const src = "SUMMARY:" + "Zápas – Šumperk, Přerov a Ždánice ".repeat(6);
  const folded = icsFold(src), lines = folded.split("\r\n");
  assert.ok(lines.length > 1);
  lines.forEach(l => assert.ok(new TextEncoder().encode(l).length <= 75, "řádek do 75 bajtů"));
  lines.slice(1).forEach(l => assert.ok(l.startsWith(" "), "navazující řádek začíná mezerou"));
  assert.equal(lines.map((l, i) => (i ? l.slice(1) : l)).join(""), src);
  assert.equal(icsFold("KRÁTKÝ"), "KRÁTKÝ");
});

// ===== Událost =====
test("trénink: UID, čas v UTC, konec, soukromí, sraz a dvě připomínky", () => {
  const L = icsEvent(tr(), O);
  assert.equal(val(L, "UID"), "e1@hockeycoach");
  assert.equal(val(L, "DTSTART"), "20261110T170000Z");
  assert.equal(val(L, "DTEND"), "20261110T180000Z");
  assert.equal(val(L, "SUMMARY"), "Trénink");
  assert.equal(val(L, "DESCRIPTION"), "Sraz 17:30");
  assert.equal(val(L, "CLASS"), "PRIVATE");
  assert.equal(val(L, "STATUS"), "CONFIRMED");
  assert.equal(val(L, "TRANSP"), "OPAQUE");
  assert.equal(L.filter(l => l === "BEGIN:VALARM").length, ICS_ALARMS.length);
  assert.deepEqual(L.filter(l => l.startsWith("TRIGGER:")), ["TRIGGER:-PT24H", "TRIGGER:-PT2H"]);
  assert.equal(L[0], "BEGIN:VEVENT");
  assert.equal(L[L.length - 1], "END:VEVENT");
});

test("soukromí: místo, poznámka a vnitřní data události v souboru nejsou", () => {
  const txt = icsEvent(tr({place: "Zimní stadion Poruba", note: "Tajná poznámka trenéra", raw: {cash: 123, lines: {a: 1}}}), O).join("\n");
  assert.ok(!/Poruba|Tajná|poznámka|cash|lines/.test(txt));
  assert.ok(!/LOCATION/.test(txt));
});

test("trénink bez konce: konec = začátek + výchozí délka; konec přes půlnoc se opraví na výchozí délku", () => {
  assert.equal(val(icsEvent(tr({end: ""}), O), "DTEND"), "20261110T180000Z");
  const L = icsEvent(tr({time: "23:30", end: "", meet: 0}), O);
  assert.equal(val(L, "DTSTART"), "20261110T223000Z");
  assert.equal(val(L, "DTEND"), "20261110T233000Z", "start + 60 min, ne dřív než začátek");
});

test("zápas: pevná délka, název beze změny, sraz zápasu 60 min, jen jeden druh času", () => {
  const L = icsEvent(ma(), O);
  assert.equal(val(L, "SUMMARY"), "Zápas – Ostrava");
  assert.equal(val(L, "DTSTART"), "20261114T140000Z");
  assert.equal(val(L, "DTEND"), icsStamp(Date.UTC(2026, 10, 14, 14, 0) + ICS_MATCH_MIN * 60000));
  assert.equal(val(L, "DESCRIPTION"), "Sraz 14:00");
});

test("sraz 0 = bez řádku Sraz", () => {
  assert.equal(val(icsEvent(tr({meet: 0}), O), "DESCRIPTION"), "");
});

test("zrušená událost: STATUS:CANCELLED, ZRUŠENO v názvu, bez připomínek, nezabírá čas", () => {
  const L = icsEvent(tr({raw: {cancelled: {by: "t@x.cz", at: "2026-11-05", reason: "led"}}}), O);
  assert.equal(val(L, "STATUS"), "CANCELLED");
  assert.equal(val(L, "SUMMARY"), "ZRUŠENO – Trénink");
  assert.equal(val(L, "TRANSP"), "TRANSPARENT");
  assert.ok(!L.includes("BEGIN:VALARM"));
  assert.ok(!/led/.test(L.join("\n")), "důvod zrušení v kalendáři není");
});

test("událost bez času: celodenní, bez připomínek; den za posledním dnem měsíce a roku", () => {
  const L = icsEvent(tr({time: "", end: "", date: "2026-11-30"}), O);
  assert.equal(val(L, "DTSTART;VALUE=DATE"), "20261130");
  assert.equal(val(L, "DTEND;VALUE=DATE"), "20261201");
  assert.ok(!L.includes("BEGIN:VALARM"));
  assert.equal(val(icsEvent(tr({time: "", end: "", date: "2026-12-31"}), O), "DTEND;VALUE=DATE"), "20270101");
});

test("SEQUENCE roste s každým exportem a DTSTAMP je okamžik exportu", () => {
  const a = icsEvent(tr(), O), b = icsEvent(tr(), {defs, now: NOW + 60000});
  assert.equal(+val(b, "SEQUENCE"), +val(a, "SEQUENCE") + 1);
  assert.equal(val(a, "DTSTAMP"), "20261104T164300Z");
});

test("neplatná událost (bez data nebo id) se vynechá", () => {
  assert.deepEqual(icsEvent(tr({date: ""}), O), []);
  assert.deepEqual(icsEvent(tr({date: "10. 11. 2026"}), O), []);
  assert.deepEqual(icsEvent(tr({id: ""}), O), []);
  assert.deepEqual(icsEvent(null, O), []);
});

// ===== Kalendář =====
test("kalendář: hlavička, CRLF, vyvážené BEGIN / END, řádky do 75 bajtů", () => {
  const txt = icsCalendar([tr(), ma({title: "Zápas – " + "Dlouhé jméno soupeře ".repeat(8)}), tr({date: ""})], O);
  assert.ok(txt.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"));
  assert.ok(txt.endsWith("END:VCALENDAR\r\n"));
  assert.ok(!/[^\r]\n/.test(txt), "žádný samostatný LF");
  const lines = txt.split("\r\n").filter(Boolean);
  lines.forEach(l => assert.ok(new TextEncoder().encode(l).length <= 75, "řádek do 75 bajtů"));
  const n = k => lines.filter(l => l === k).length;
  assert.equal(n("BEGIN:VEVENT"), 2, "neplatná událost se nevypsala");
  assert.equal(n("BEGIN:VEVENT"), n("END:VEVENT"));
  assert.equal(n("BEGIN:VALARM"), n("END:VALARM"));
  assert.equal(n("BEGIN:VCALENDAR"), 1);
  assert.match(txt, /PRODID:-\/\/HockeyCoach/);
  assert.match(txt, /METHOD:PUBLISH/);
});

// ===== Moje události =====
test("mineForCalendar: jen od dneška a jen Jdu / Nejsem jistý, zrušené také, seřazeno podle data a času", () => {
  const evs = [tr({id: "a", date: "2026-11-12", time: "18:00"}), tr({id: "b", date: "2026-11-10", time: "19:00"}), tr({id: "c", date: "2026-11-03"}),
    tr({id: "d", date: "2026-11-11"}), tr({id: "e", date: "2026-11-11"}), tr({id: "f", date: "2026-11-10", time: "17:00", raw: {cancelled: {by: "x", at: "y", reason: ""}}})];
  const A = {a: {p1: {st: "yes"}}, b: {p1: {st: "maybe"}}, c: {p1: {st: "yes"}}, d: {p1: {st: "no"}}, f: {p1: {st: "yes"}}, e: {p2: {st: "yes"}}};
  assert.deepEqual(mineForCalendar(evs, A, "p1", "2026-11-04").map(e => e.id), ["f", "b", "a"]);
  assert.deepEqual(mineForCalendar(evs, A, "", "2026-11-04"), []);
  assert.deepEqual(mineForCalendar(evs, null, "p1", "2026-11-04"), []);
});
