// Browser: dashboard Products tab per-colour save, highlight, undo, stepper (desktop + phone).
import { ok, finish, owner, fixtureProduct, colourStock, browser, DASHBOARD } from "../lib.mjs";
try {
  const single = await fixtureProduct({ colours: [{ name: "Standard", price: 749, stock: 14 }] });
  const multi = await fixtureProduct({ colours: [{ name: "Gold", price: 699, stock: 10 }, { name: "Blue", price: 799, originalPrice: 1299, stock: 4 }] });
  const own = await owner(); const b = browser("qa-dash-suite"); const { ab, js } = b;
  b.signIn(DASHBOARD, own.token); ab("set", "viewport", "1280", "900"); b.go(DASHBOARD + "/");
  js("[...document.querySelectorAll('.nav-item')].find(x => x.textContent.includes('Products')).click(), 'ok'"); ab("wait", "1200");
  const row = (label) => `[...document.querySelectorAll('.stock-row')].find(r => r.getAttribute('aria-label')?.startsWith(${JSON.stringify(label)}))`;
  const type = (label, i, v) => js(`(() => { const input = ${row(label)}.querySelectorAll('input')[${i}]; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(v)}); input.dispatchEvent(new Event('input', { bubbles: true })); return 'ok'; })()`);
  const state = (label) => JSON.parse(js(`JSON.stringify({ dirty: ${row(label)}.classList.contains('dirty'), summary: ${row(label)}.querySelector('.stock-change-summary')?.textContent || '' })`));
  ok("no global Save changes button", !js("String([...document.querySelectorAll('button')].some(x => x.textContent === 'Save changes'))").includes("true"));
  type(single.name, 1, "15"); js("document.activeElement.blur(), 'ok'"); ab("wait", "200");
  ok("single-colour row stays highlighted after clicking outside", state(single.name).dirty && state(single.name).summary.includes("stock 14 → 15"));
  ok("multi-colour product shows a row per colour", js(`String(document.querySelectorAll('.stock-row-colour[aria-label^=${JSON.stringify(multi.name)}]').length)`) === "2");
  type(`${multi.name} Blue`, 1, "6"); ab("wait", "200");
  ok("banner counts 2 unsaved", js("document.querySelector('.unsaved-banner')?.textContent || ''").startsWith("2 items"));
  js(`[...${row(`${multi.name} Blue`)}.querySelectorAll('button')].find(x => x.textContent === 'Save colour').click(), 'ok'`); ab("wait", "1800");
  ok("Save colour changes only Blue", await colourStock(multi.colours[1].id) === 6 && await colourStock(multi.colours[0].id) === 10 && await colourStock(single.colours[0].id) === 14);
  ok("other unsaved row still highlighted", state(single.name).dirty);
  js(`[...${row(single.name)}.querySelectorAll('button')].find(x => x.textContent === 'Undo').click(), 'ok'`); ab("wait", "300");
  ok("Undo clears the highlight", !state(single.name).dirty);
  js(`${row(`${multi.name} Gold`)}.querySelector('.stepper button').click(), 'ok'`); ab("wait", "200");
  ok("up arrow adds 1 and highlights", state(`${multi.name} Gold`).summary.includes("stock 10 → 11"));
  b.shot("dashboard-products-desktop.png");
  ab("set", "viewport", "390", "844"); ab("wait", "600");
  ok("phone: no sideways scroll", b.noSidewaysScroll());
} finally { await finish(); }
