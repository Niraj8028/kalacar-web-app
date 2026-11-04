# Kalacar regression tests

Runs against the **local** shop (`npm run dev`, port 3000) and dashboard (port 5173) using the
development database in `.env.local`. Every suite creates its own `QA Fixture …` products and
`qa-…@example.invalid` accounts and removes them afterwards, so your real catalogue, customers
and orders are never changed.

```bash
npm run qa                       # everything
npm run qa -- orders colours     # only some suites
```

Needs: both dev servers running; you have signed in to the dashboard once with Google (owner
account); `agent-browser` installed for the `*-ui` suites. Screenshots go to `qa/output/`
(git-ignored).

| Suite | Covers |
|---|---|
| addresses | saved addresses: validation, default, 10-address limit, other users blocked |
| orders | cancel / refund / tracking note, no "mark paid", stock back to the same colour |
| colours | colour editing + conflicts, gift packaging, a Razorpay **test-mode** checkout per colour |
| race | dashboard stock edits vs checkouts never lose a sale |
| validation | oversized input, fake images, ₹0 price, request size limits, same-origin guard |
| ratelimit | sign-in / sign-up / Google / checkout limits (uses fake IPs) |
| shop-ui | colour picker, Buy now, cart colour change, gift packaging (phone + desktop) |
| dashboard-products-ui | per-colour save, unsaved highlight, Undo, stepper |
