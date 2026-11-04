"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { AddressFields, addressSummary, emptyAddress, toDraft } from "@/components/address-fields";
import type { AddressDraft, SavedAddress } from "@/components/address-fields";

const MAX = 10;

/** Saved-address manager for the account page: list, add, edit, delete, set default. */
export default function AddressBook({ defaultName, defaultPhone }: { defaultName: string; defaultPhone: string }) {
  const [addresses, setAddresses] = useState<SavedAddress[] | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; draft: AddressDraft; makeDefault: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fetchAddresses = useCallback(() => fetch("/api/account/addresses", { cache: "no-store" })
    .then(async response => {
      const data = await response.json() as { addresses?: SavedAddress[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Saved addresses are unavailable right now.");
      return data.addresses ?? [];
    }), []);
  const load = useCallback(() => fetchAddresses().then(setAddresses), [fetchAddresses]);
  useEffect(() => {
    let active = true;
    fetchAddresses()
      .then(list => { if (active) setAddresses(list); })
      .catch(e => { if (active) { setAddresses([]); setError(e instanceof Error ? e.message : "Saved addresses are unavailable right now."); } });
    return () => { active = false; };
  }, [fetchAddresses]);

  async function call(url: string, init: RequestInit, done: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      await load(); setNotice(done); return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong. Please try again."); return false; }
    finally { setBusy(false); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const body = JSON.stringify({ ...editing.draft, isDefault: editing.makeDefault });
    const ok = editing.id
      ? await call(`/api/account/addresses/${editing.id}`, { method: "PATCH", body }, "Address updated.")
      : await call("/api/account/addresses", { method: "POST", body }, "Address saved.");
    if (ok) setEditing(null);
  }

  return <section className="address-book" aria-labelledby="address-book-title">
    <div className="address-book-head">
      <h2 id="address-book-title">Saved addresses</h2>
      {!editing && addresses && addresses.length < MAX && <button type="button" className="address-add" onClick={() => { setEditing({ id: null, draft: emptyAddress(defaultName, defaultPhone), makeDefault: false }); setNotice(""); setError(""); }}>+ Add address</button>}
    </div>
    {error && <p className="account-message error" role="alert">{error}</p>}
    {notice && <p className="account-message" role="status">{notice}</p>}
    {editing ? (
      <form className="address-form" onSubmit={save}>
        <h3>{editing.id ? "Edit address" : "New address"}</h3>
        <AddressFields idPrefix="book" value={editing.draft} onChange={draft => setEditing({ ...editing, draft })} />
        <label className="address-check"><input type="checkbox" checked={editing.makeDefault} onChange={e => setEditing({ ...editing, makeDefault: e.target.checked })} />Use as my default address</label>
        <div className="address-form-actions">
          <button type="submit" className="checkout-demo-button" disabled={busy}>{busy ? "Saving…" : "Save address"}</button>
          <button type="button" className="address-link" disabled={busy} onClick={() => setEditing(null)}>Cancel</button>
        </div>
      </form>
    ) : addresses === null ? <p className="empty-orders" role="status">Loading saved addresses…</p>
      : addresses.length === 0 ? <p className="empty-orders">No saved addresses yet. Add one here, or tick “Save this address” at checkout.</p>
      : <ul className="address-list">{addresses.map(address => (
        <li key={address.id} className={`address-card${address.isDefault ? " is-default" : ""}`}>
          <div className="address-card-top"><span className="address-chip">{address.label}</span>{address.isDefault && <span className="address-chip default">Default</span>}</div>
          <strong>{address.fullName}</strong>
          <p>{addressSummary(address)}</p>
          <p className="address-phone">{address.phone}</p>
          {confirmDelete === address.id ? (
            <div className="address-actions" role="group" aria-label="Confirm delete">
              <span>Delete this address?</span>
              <button type="button" className="address-link danger" disabled={busy} onClick={() => void call(`/api/account/addresses/${address.id}`, { method: "DELETE" }, "Address deleted.").then(() => setConfirmDelete(""))}>Yes, delete</button>
              <button type="button" className="address-link" onClick={() => setConfirmDelete("")}>Keep</button>
            </div>
          ) : (
            <div className="address-actions">
              <button type="button" className="address-link" onClick={() => { setEditing({ id: address.id, draft: toDraft(address), makeDefault: address.isDefault }); setNotice(""); setError(""); }}>Edit</button>
              {!address.isDefault && <button type="button" className="address-link" disabled={busy} onClick={() => void call(`/api/account/addresses/${address.id}`, { method: "PATCH", body: JSON.stringify({ setDefault: true }) }, "Default address updated.")}>Set as default</button>}
              <button type="button" className="address-link danger" onClick={() => setConfirmDelete(address.id)}>Delete</button>
            </div>
          )}
        </li>
      ))}</ul>}
    {addresses && addresses.length >= MAX && !editing && <p className="account-checkout-note">You’ve saved the maximum of {MAX} addresses. Delete one to add another.</p>}
    <p className="account-checkout-note">Changing a saved address never changes orders you’ve already placed.</p>
  </section>;
}
