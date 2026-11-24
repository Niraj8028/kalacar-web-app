import { DELIVERY_ESTIMATE } from "@/lib/store-info";
import { SUPPORT_WHATSAPP, whatsappLink } from "@/data/support";

// The customer emails' wording and layout. Plain tables and inline styles, because email apps ignore most CSS.

export type OrderEmailData = {
  orderId: string; name: string; email: string; phone: string; address: string; pincode: string; total: number; placedAt: Date;
  items: { name: string; variant: string; price: number; quantity: number }[];
  giftWrapPrice: number | null; couponCode: string; discount: number; viewLink: string | null;
  /** The owner's delivery time; the default is used when it's missing. */
  deliveryEstimate?: string;
};

const INK = "#28211c", MUTED = "#6f6259", ACCENT = "#8d3e2e", LINE = "#eadfd3", PAGE = "#fbf7f1";

export const orderNumber = (id: string) => id.slice(0, 8).toUpperCase();
const money = (n: number) => `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}`;
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
const multiline = (value: string) => escape(value).replaceAll("\n", "<br>");
const date = (value: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(value);

/** What happens next; `estimate` is the delivery time from the owner's settings. */
export const nextSteps = (estimate: string) => [
  { title: "We choose your murti", text: "We pick out your murti and check it carefully." },
  { title: "We pack and dispatch it", text: "It is packed safely and handed to the courier. Tracking details appear on your order once it ships." },
  { title: "We ship it to you", text: `It reaches your address in ${estimate}.` },
];

function layout(title: string, body: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title></head>
<body style="margin:0;padding:0;background:${PAGE};font-family:Georgia,'Times New Roman',serif;color:${INK}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${LINE}">
<tr><td style="padding:22px 28px;border-bottom:1px solid ${LINE};font-size:22px;letter-spacing:4px;color:${ACCENT}">KALACAR</td></tr>
<tr><td style="padding:26px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6">${body}</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid ${LINE};font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${MUTED}">Questions? WhatsApp us on <a href="${whatsappLink()}" style="color:${ACCENT}">${SUPPORT_WHATSAPP.display}</a> or reply to this email.</td></tr>
</table></td></tr></table></body></html>`;
}

const button = (href: string, label: string) => `<p style="margin:24px 0"><a href="${escape(href)}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;padding:12px 22px;font-weight:bold">${escape(label)}</a></p>`;

export function buildOrderEmail(order: OrderEmailData) {
  const number = orderNumber(order.orderId);
  const steps = nextSteps(order.deliveryEstimate ?? DELIVERY_ESTIMATE);
  const firstName = order.name.trim().split(/\s+/)[0] || "there";
  const lines = [
    ...order.items.map(item => ({ label: `${item.name}${item.variant ? ` (${item.variant})` : ""} × ${item.quantity}`, amount: money(item.price * item.quantity) })),
    ...(order.giftWrapPrice !== null ? [{ label: "Gift packaging", amount: money(order.giftWrapPrice) }] : []),
    ...(order.couponCode && order.discount ? [{ label: `Coupon ${order.couponCode}`, amount: `−${money(order.discount)}` }] : []),
  ];
  const subject = `Order ${number} confirmed – Kalacar`;
  const html = layout(subject, `
<h1 style="margin:0 0 6px;font-family:Georgia,serif;font-size:24px;font-weight:normal">Thank you, ${escape(firstName)}. Your order is confirmed.</h1>
<p style="margin:0 0 18px;color:${MUTED}">Order <strong style="color:${INK}">${number}</strong> · Placed on ${date(order.placedAt)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${LINE}">
${lines.map(line => `<tr><td style="padding:10px 0;border-bottom:1px solid ${LINE}">${escape(line.label)}</td><td align="right" style="padding:10px 0;border-bottom:1px solid ${LINE};white-space:nowrap">${line.amount}</td></tr>`).join("")}
<tr><td style="padding:12px 0;font-weight:bold">Total paid</td><td align="right" style="padding:12px 0;font-weight:bold">${money(order.total)}</td></tr>
</table>
<h2 style="margin:22px 0 6px;font-size:15px">Delivering to</h2>
<p style="margin:0;color:${MUTED}">${escape(order.name)}<br>${multiline(order.address)}<br>PIN ${escape(order.pincode)}<br>${escape(order.phone)}</p>
<h2 style="margin:22px 0 6px;font-size:15px">What happens next</h2>
<ol style="margin:0;padding-left:20px">${steps.map(step => `<li style="margin:0 0 8px"><strong>${escape(step.title)}</strong><br><span style="color:${MUTED}">${escape(step.text)}</span></li>`).join("")}</ol>
${order.viewLink ? button(order.viewLink, "View your order") : ""}
<p style="margin:0;color:${MUTED};font-size:13px">Please keep your order number ${number} handy if you contact us.</p>`);
  const text = [
    `Thank you, ${firstName}. Your Kalacar order is confirmed.`,
    `Order ${number} · Placed on ${date(order.placedAt)}`,
    "",
    ...lines.map(line => `${line.label}: ${line.amount}`),
    `Total paid: ${money(order.total)}`,
    "",
    "Delivering to:", order.name, order.address, `PIN ${order.pincode}`, order.phone,
    "",
    "What happens next:",
    ...steps.map((step, index) => `${index + 1}. ${step.title}: ${step.text}`),
    ...(order.viewLink ? ["", `View your order: ${order.viewLink}`] : []),
    "",
    `Questions? WhatsApp us on ${SUPPORT_WHATSAPP.display} or reply to this email.`,
  ].join("\n");
  return { subject, html, text };
}

export function buildSignInEmail(name: string, link: string, minutes: number) {
  const firstName = name.trim().split(/\s+/)[0] || "there";
  const subject = "Your Kalacar sign-in link";
  const html = layout(subject, `
<h1 style="margin:0 0 10px;font-family:Georgia,serif;font-size:22px;font-weight:normal">Namaste, ${escape(firstName)}</h1>
<p style="margin:0">Tap the button to sign in and see your orders. The link works once and expires in ${minutes} minutes.</p>
${button(link, "Sign in to Kalacar")}
<p style="margin:0;color:${MUTED};font-size:13px">If you didn't ask for this, you can ignore this email. Nobody can sign in without this link.</p>`);
  const text = `Namaste, ${firstName}\n\nOpen this link to sign in and see your Kalacar orders. It works once and expires in ${minutes} minutes:\n${link}\n\nIf you didn't ask for this, you can ignore this email.`;
  return { subject, html, text };
}
