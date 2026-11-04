// Specification cards, highlights and the delivery line: dashboard editor → API → product page.
import { crash, q, ok, finish, owner, fixtureProduct, browser, SHOP, DASHBOARD, ORIGIN } from "../lib.mjs";
try {
  const product = await fixtureProduct({ colours: [{ name: "Standard", price: 799, stock: 9 }] });
  const plain = await fixtureProduct({ colours: [{ name: "Standard", price: 500, stock: 3 }] });
  const own = await owner(); const OH = { ...ORIGIN, Cookie: own.cookie };
  const b = browser("qa-facts-suite"); const { ab, js } = b;
  // Dashboard: Edit details → Add common → fill values → add highlight → Save
  b.signIn(DASHBOARD, own.token); ab("set", "viewport", "1280", "900"); b.go(DASHBOARD + "/");
  js("[...document.querySelectorAll('.nav-item')].find(x => x.textContent.includes('Products')).click(), 'ok'"); ab("wait", "1200");
  js(`[...[...document.querySelectorAll('.stock-row')].find(r => r.getAttribute('aria-label')?.startsWith(${JSON.stringify(product.name)})).querySelectorAll('button')].find(x => x.textContent === 'Edit details').click(), 'ok'`); ab("wait", "600");
  js("[...document.querySelectorAll('.facts-editor button')].find(x => x.textContent === 'Add common').click(), 'ok'"); ab("wait", "300");
  ok("Add common adds Height, Material, Finish, Weight", js("JSON.stringify([...document.querySelectorAll('.facts-editor .fact-row:not(.highlight-row) input[list]')].map(i => i.value))") === JSON.stringify(["Height", "Material", "Finish", "Weight"]));
  const setNth = (sel, n, v) => js(`(() => { const el = document.querySelectorAll(${JSON.stringify(sel)})[${n}]; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(v)}); el.dispatchEvent(new Event('input', { bubbles: true })); return 'ok'; })()`);
  const values = ["5 in (12.7 cm)", "Resin & marble dust", "Hand-painted", ""];
  values.forEach((v, i) => setNth(".facts-editor .fact-row:not(.highlight-row) input:not([list])", i, v));
  js("[...document.querySelectorAll('.facts-editor button')].find(x => x.textContent === '+ Add highlight').click(), 'ok'"); ab("wait", "200"); setNth(".facts-editor .highlight-row input", 0, "Hand-finished detail");
  js("[...document.querySelectorAll('.facts-editor button')].find(x => x.textContent === '+ Add highlight').click(), 'ok'"); ab("wait", "200"); setNth(".facts-editor .highlight-row input", 1, "Inspected piece by piece");
  js("[...document.querySelectorAll('.add-product-form .form-actions button')].find(x => x.textContent.startsWith('Save product')).click(), 'ok'"); ab("wait", "2500");
  const err = js("document.querySelector('.add-product-form .form-error')?.textContent || ''");
  ok("Weight with no value refused with a clear message", err.includes("“Weight” needs a value"), err);
  js("[...document.querySelectorAll('.facts-editor .fact-row:not(.highlight-row)')][3].querySelector('.icon-button.danger').click(), 'ok'"); ab("wait", "200");
  js("[...document.querySelectorAll('.add-product-form .form-actions button')].find(x => x.textContent.startsWith('Save product')).click(), 'ok'"); ab("wait", "2500");
  const [row] = await q("SELECT specs, highlights FROM kalacar_products WHERE id=?", [product.id]);
  const specs = typeof row.specs === "string" ? JSON.parse(row.specs) : row.specs, highlights = typeof row.highlights === "string" ? JSON.parse(row.highlights) : row.highlights;
  ok("specs saved in order", JSON.stringify(specs) === JSON.stringify([{ label: "Height", value: "5 in (12.7 cm)" }, { label: "Material", value: "Resin & marble dust" }, { label: "Finish", value: "Hand-painted" }]), JSON.stringify(specs));
  ok("highlights saved", JSON.stringify(highlights) === JSON.stringify(["Hand-finished detail", "Inspected piece by piece"]));
  // API limits
  const form = (extra) => { const f = new FormData(); f.set("name", product.name); f.set("deity", "QA"); f.set("accordions", "[]"); f.set("colours", JSON.stringify([{ id: product.colours[0].id, name: "Standard", swatch: "#b08d57", price: 799, originalPrice: 799, stock: 9, active: true, gallery: [{ kind: "existing", src: product.colours[0].gallery[0] }] }])); for (const [k, v] of Object.entries(extra)) f.set(k, v); return f; };
  ok("more than 8 specs refused", (await fetch(`${SHOP}/api/admin/products/${product.id}`, { method: "PATCH", headers: OH, body: form({ specs: JSON.stringify(Array.from({ length: 9 }, (_, i) => ({ label: "L" + i, value: "V" }))) }) })).status === 400);
  ok("overlong highlight refused", (await fetch(`${SHOP}/api/admin/products/${product.id}`, { method: "PATCH", headers: OH, body: form({ specs: JSON.stringify(specs), highlights: JSON.stringify(["x".repeat(81)]) }) })).status === 400);
  // Shop
  for (const [w, h, tag] of [[390, 844, "phone"], [1280, 900, "desktop"]]) {
    ab("set", "viewport", String(w), String(h)); b.go(`${SHOP}/products/${product.id}`);
    ok(`${tag}: three spec cards with matching icons`, js("String(document.querySelectorAll('.spec-card').length)") === "3" && js("JSON.stringify([...document.querySelectorAll('.spec-card dt')].map(d => d.textContent))") === JSON.stringify(["Height", "Material", "Finish"]));
    ok(`${tag}: highlights shown with ticks`, js("String(document.querySelectorAll('.product-highlights li svg').length)") === "2");
    ok(`${tag}: delivery line shown`, js("document.querySelector('.delivery-line')?.textContent || ''").includes("12–17 business days"));
    ok(`${tag}: no sideways scroll`, b.noSidewaysScroll());
    js("document.querySelector('.delivery-line').scrollIntoView({ block: 'start' }), 'ok'"); b.shot(`product-facts-${tag}.png`);
  }
  b.go(`${SHOP}/products/${plain.id}`);
  ok("product without facts shows no empty sections", js("String(document.querySelectorAll('.spec-cards, .product-highlights').length)") === "0" && js("String(Boolean(document.querySelector('.delivery-line')))") === "true");
} catch (error) { crash(error); } finally { await finish(); }
