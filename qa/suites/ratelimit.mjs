// Rate limits on sign-in, sign-up, Google start and checkout (fake IPs keep your own limits clear).
import { q, ok, finish, SHOP, ORIGIN, onCleanup, session } from "../lib.mjs";
try {
  const RUN = Math.floor(Math.random() * 200) + 20, ip = (n) => `10.${RUN}.0.${n}`;
  const email = `qa-rl-${RUN}@example.invalid`, email2 = `qa-rl2-${RUN}@example.invalid`, pw = `QaLimit-${RUN}-pass!`;
  onCleanup(() => q("DELETE FROM kalacar_users WHERE email IN (?)", [[email, email2]]));
  const post = (path, body, from, extra = {}) => fetch(SHOP + path, { method: "POST", headers: { ...ORIGIN, "Content-Type": "application/json", "X-Forwarded-For": from, ...extra }, body: JSON.stringify(body) });
  let codes = []; for (let i = 0; i < 6; i++) codes.push((await post("/api/auth/register", { name: "" }, ip(1))).status);
  ok("register: 6th from one IP → 429", codes[5] === 429 && codes.slice(0, 5).every(c => c === 400), codes.join(","));
  ok("register a test account", (await post("/api/auth/register", { name: "QA Limit", email, phone: "9000000001", password: pw }, ip(2))).status === 200);
  codes = []; for (let i = 0; i < 9; i++) codes.push((await post("/api/auth/login", { email, password: "wrong" + i }, ip(10 + i))).status);
  ok("login: 9th wrong password for an email → 429 (across IPs)", codes[8] === 429 && codes.slice(0, 8).every(c => c === 401), codes.join(","));
  codes = []; for (let i = 0; i < 21; i++) codes.push((await post("/api/auth/login", { email: `nobody${i}-${RUN}@example.invalid`, password: "x" }, ip(3))).status);
  ok("login: 21st from one IP → 429", codes[20] === 429);
  await post("/api/auth/register", { name: "QA Limit2", email: email2, phone: "9000000002", password: pw }, ip(4));
  for (let i = 0; i < 7; i++) await post("/api/auth/login", { email: email2, password: "wrong" }, ip(40 + i));
  ok("correct password after 7 typos works", (await post("/api/auth/login", { email: email2, password: pw }, ip(50))).status === 200);
  codes = []; for (let i = 0; i < 31; i++) codes.push((await fetch(SHOP + "/api/auth/google/start", { redirect: "manual", headers: { "X-Forwarded-For": ip(5) } })).status);
  ok("Google start: 31st → 429", codes[29] === 307 && codes[30] === 429);
  codes = []; for (let i = 0; i < 6; i++) codes.push((await post("/api/auth/register", { name: "" }, `203.0.113.${i}, ${ip(6)}`)).status);
  ok("faked leading X-Forwarded-For can't dodge limits", codes[5] === 429);
  const [u] = await q("SELECT id FROM kalacar_users WHERE email=?", [email2]); const s = await session(u.id);
  codes = []; for (let i = 0; i < 11; i++) codes.push((await post("/api/checkout/orders", { idempotencyKey: "bad" }, ip(7), { Cookie: s.cookie })).status);
  ok("checkout: 11th per account → 429", codes[10] === 429 && codes.slice(0, 10).every(c => c === 400));
} finally { await finish(); }
