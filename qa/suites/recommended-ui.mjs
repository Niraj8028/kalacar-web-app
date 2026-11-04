// "You may also like": same deity first, only buyable products, never the current one, max 4.
import { crash, ok, finish, fixtureProduct, browser, SHOP } from "../lib.mjs";
import { randomBytes } from "node:crypto";
try {
  const deity = `QA Deity ${randomBytes(2).toString("hex")}`;
  const A = await fixtureProduct({ deity, colours: [{ name: "Standard", price: 700, stock: 5 }] });
  const B = await fixtureProduct({ deity, colours: [{ name: "Gold", price: 900, stock: 3 }, { name: "Blue", price: 1100, originalPrice: 1500, stock: 2 }] });
  const C = await fixtureProduct({ deity: "QA Other", colours: [{ name: "Standard", price: 650, originalPrice: 1000, stock: 4 }] });
  const D = await fixtureProduct({ deity, colours: [{ name: "Standard", price: 500, stock: 0 }] });
  const E = await fixtureProduct({ deity, colours: [{ name: "Hidden", price: 500, stock: 6, active: false }] });
  const b = browser("qa-rec-suite"); const { ab, js } = b;
  const names = () => JSON.parse(js("JSON.stringify([...document.querySelectorAll('.recommended-card b')].map(x => x.textContent))"));
  for (const [w, h, tag] of [[390, 844, "phone"], [1280, 900, "desktop"]]) {
    ab("open", SHOP + "/"); ab("set", "viewport", String(w), String(h)); b.go(`${SHOP}/products/${A.id}`);
    const list = names();
    ok(`${tag}: same deity first`, list[0] === B.name, JSON.stringify(list));
    ok(`${tag}: other deity included`, list.includes(C.name));
    ok(`${tag}: out-of-stock, hidden-only and current product excluded`, !list.includes(D.name) && !list.includes(E.name) && !list.includes(A.name));
    ok(`${tag}: at most 4 cards`, list.length <= 4 && list.length >= 2);
    const bCard = `[...document.querySelectorAll('.recommended-card')].find(x => x.querySelector('b').textContent === ${JSON.stringify(B.name)})`;
    ok(`${tag}: multi-colour card shows "from" price and dots`, js(`${bCard}.querySelector('.recommended-price').textContent`).startsWith("from ₹900") && js(`String(${bCard}.querySelectorAll('.colour-dot').length)`) === "2");
    ok(`${tag}: real discount shown`, js(`[...document.querySelectorAll('.recommended-card')].find(x => x.querySelector('b').textContent === ${JSON.stringify(C.name)}).querySelector('.badge-chip.save')?.textContent || ''`) === "Save 35%");
    ok(`${tag}: no sideways scroll`, b.noSidewaysScroll());
    js("document.querySelector('.recommended').scrollIntoView({ block: 'start' }), 'ok'"); b.shot(`recommended-${tag}.png`);
  }
  js(`[...document.querySelectorAll('.recommended-card')].find(x => x.querySelector('b').textContent === ${JSON.stringify(B.name)}).click(), 'ok'`); ab("wait", "1800");
  ok("card opens that product", js("location.pathname") === `/products/${B.id}`);
  ok("on B's page, A (same deity) comes first", names()[0] === A.name);
} catch (error) { crash(error); } finally { await finish(); }
