// Browser: shop card, colour picker, Buy now, cart colour change, gift packaging (phone + desktop).
import { q, ok, finish, customer, fixtureProduct, colourStock, browser, SHOP, onCleanup } from "../lib.mjs";
try {
  const product = await fixtureProduct({ colours: [{ name: "Gold", swatch: "#b08d57", price: 1219, stock: 50 }, { name: "Blue", swatch: "#4821d4", price: 1219, stock: 4 }] });
  const [gold, blue] = product.colours; const shopper = await customer("shop", "9000000005");
  const gift = await q("SELECT value FROM kalacar_settings WHERE name='gift_wrap'");
  await q("INSERT INTO kalacar_settings (name,value) VALUES ('gift_wrap',?) ON DUPLICATE KEY UPDATE value=VALUES(value)", [JSON.stringify({ enabled: true, price: 49, title: "Gift-ready packaging", description: "QA" })]);
  onCleanup(() => gift.length ? q("UPDATE kalacar_settings SET value=? WHERE name='gift_wrap'", [typeof gift[0].value === "string" ? gift[0].value : JSON.stringify(gift[0].value)]) : q("DELETE FROM kalacar_settings WHERE name='gift_wrap'"));
  const b = browser("qa-shop-suite"); const { ab, js } = b;
  const card = `[...document.querySelectorAll('.product-card')].find(x => x.textContent.includes(${JSON.stringify(product.name)}))`;
  const pick = (name) => js(`[...document.querySelectorAll('.colour-option')].find(x => x.textContent.includes(${JSON.stringify(name)})).querySelector('input').click(), 'ok'`);
  for (const [w, h, tag] of [[390, 844, "phone"], [1280, 900, "desktop"]]) {
    b.signIn(SHOP, shopper.token); ab("set", "viewport", String(w), String(h)); ab("eval", "localStorage.removeItem('kalacar-demo-cart-v1'), 'ok'");
    b.go(SHOP + "/");
    ok(`${tag}: card shows colour dots and Choose colour`, js(`String(${card}.querySelectorAll('.card-swatches .colour-dot').length)`) === "2" && js(`${card}.querySelector('.product-buy-row a')?.textContent || ''`) === "Choose colour");
    b.go(`${SHOP}/products/${product.id}`);
    const before = js("document.querySelector('.detail-main-image img').getAttribute('src')"); pick("Blue"); ab("wait", "500");
    ok(`${tag}: choosing Blue swaps the photo and address`, before !== js("document.querySelector('.detail-main-image img').getAttribute('src')") && js("location.search").includes(blue.id));
    ok(`${tag}: real stock message`, js("document.querySelector('.stock-message').textContent") === "In stock");
    js("[...document.querySelectorAll('.quantity-control button')].find(x => x.getAttribute('aria-label') === 'Increase quantity').click(), 'ok'"); ab("wait", "200");
    js("document.querySelector('.buy-buttons .detail-add-button').click(), 'ok'"); ab("wait", "500");
    ok(`${tag}: Add to bag adds 2 Blue`, js("localStorage.getItem('kalacar-demo-cart-v1')") === JSON.stringify([{ id: product.id, variantId: blue.id, quantity: 2 }]));
    pick("Gold"); ab("wait", "300"); js("document.querySelector('.buy-now-button').click(), 'ok'"); ab("wait", "2500");
    ok(`${tag}: Buy now opens the cart with both colours`, js("location.pathname") === "/cart" && js("String(document.querySelectorAll('.cart-line').length)") === "2");
    js("document.querySelector('.gift-option input').click(), 'ok'"); ab("wait", "300");
    ok(`${tag}: total includes gift packaging`, js("document.querySelector('.cart-total strong').textContent").replace(/\D/g, "") === String(1219 * 3 + 49));
    b.shot(`shop-cart-${tag}.png`);
    js(`(() => { const s = [...document.querySelectorAll('.cart-colour select')][1]; s.value = ${JSON.stringify(blue.id)}; s.dispatchEvent(new Event('change', { bubbles: true })); return 'ok'; })()`); ab("wait", "500");
    ok(`${tag}: changing Gold to Blue merges into 3 Blue`, js("localStorage.getItem('kalacar-demo-cart-v1')") === JSON.stringify([{ id: product.id, variantId: blue.id, quantity: 3 }]));
    ok(`${tag}: no sideways scroll`, b.noSidewaysScroll());
  }
  ok("browsing created no order and kept stock", await colourStock(gold.id) === 50 && await colourStock(blue.id) === 4);
} finally { await finish(); }
