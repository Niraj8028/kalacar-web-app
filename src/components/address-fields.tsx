"use client";

import { useEffect, useRef, useState } from "react";
import { LocationPicker } from "@/components/location-picker";
import type { LocationAddress } from "@/components/location-picker";

export type AddressDraft = {
  label: "Home" | "Work" | "Other"; fullName: string; phone: string; address: string; city: string;
  state: string; landmark: string; instructions: string; pincode: string;
};
export type SavedAddress = AddressDraft & { id: string; isDefault: boolean };

export const emptyAddress = (fullName = "", phone = ""): AddressDraft => ({
  label: "Home", fullName, phone, address: "", city: "", state: "", landmark: "", instructions: "", pincode: "",
});

export const toDraft = ({ label, fullName, phone, address, city, state, landmark, instructions, pincode }: SavedAddress): AddressDraft =>
  ({ label, fullName, phone, address, city, state, landmark, instructions, pincode });

/** One-line summary used on address cards. */
export const addressSummary = (a: AddressDraft) =>
  [a.address, a.landmark && `Near ${a.landmark}`, a.city, a.state, a.pincode].filter(Boolean).join(", ");

/** States and union territories, offered as suggestions in the State field. */
export const INDIAN_STATES = ["Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"];

type PinStatus = { pin: string; kind: "checking" | "found" | "mismatch" | "notfound" | "error"; text: string } | null;

/** Controlled delivery-address inputs shared by checkout and the account address book. */
export function AddressFields({ value, onChange, idPrefix }: { value: AddressDraft; onChange: (next: AddressDraft) => void; idPrefix: string }) {
  const set = (key: keyof AddressDraft) => (event: { target: { value: string } }) => onChange({ ...value, [key]: event.target.value });
  // Values last filled from the map; a field is only replaced if it is empty or still holds that value,
  // so anything the customer typed themselves is never overwritten.
  const autofilled = useRef<Partial<Record<"address" | "city" | "state" | "pincode", string>>>({});
  // Latest value, so a slow PIN lookup fills the form as it is *now*, not as it was when typed.
  const latest = useRef(value);
  useEffect(() => { latest.current = value; }, [value]);
  const [pinStatus, setPinStatus] = useState<PinStatus>(null);
  const lookupPin = async (pin: string) => {
    setPinStatus({ pin, kind: "checking", text: "Checking PIN…" });
    try {
      const response = await fetch(`/api/pincode/${pin}`);
      const data = await response.json() as { found?: boolean; city?: string; state?: string; error?: string };
      if (latest.current.pincode !== pin) return; // customer changed the PIN meanwhile
      if (response.ok && data.found && data.city && data.state) {
        const next = { ...latest.current };
        for (const key of ["city", "state"] as const) {
          // Fill only empty fields or ones we filled before; never overwrite what the customer typed.
          if (!next[key].trim() || next[key] === autofilled.current[key]) { next[key] = data[key]!; autofilled.current[key] = data[key]!; }
        }
        onChange(next);
        const differs = (next.city !== data.city || next.state !== data.state);
        setPinStatus({ pin, kind: differs ? "mismatch" : "found", text: differs ? `India Post lists this PIN in ${data.city}, ${data.state}. Check the city and state below.` : `${data.city}, ${data.state}` });
      } else if (response.status === 404) {
        setPinStatus({ pin, kind: "notfound", text: "We couldn't find this PIN. Check it, or type the city and state yourself." });
      } else setPinStatus({ pin, kind: "error", text: data.error || "Couldn't check this PIN right now. Please type the city and state." });
    } catch {
      if (latest.current.pincode === pin) setPinStatus({ pin, kind: "error", text: "Couldn't check this PIN right now. Please type the city and state." });
    }
  };
  const changePin = (raw: string) => {
    const pin = raw.replace(/\D/g, "").slice(0, 6);
    const next = { ...value, pincode: pin };
    latest.current = next;
    onChange(next);
    if (/^[1-9]\d{5}$/.test(pin)) { if (pinStatus?.pin !== pin || pinStatus.kind === "error") void lookupPin(pin); }
    else setPinStatus(pin.length === 6 ? { pin, kind: "notfound", text: "PIN codes are 6 digits and don't start with 0." } : null);
  };
  const applyLocation = (found: LocationAddress) => {
    const next = { ...value };
    for (const key of ["address", "city", "state", "pincode"] as const) {
      if (!found[key]) continue;
      if (!next[key].trim() || next[key] === autofilled.current[key]) { next[key] = found[key]; autofilled.current[key] = found[key]; }
    }
    onChange(next);
  };
  return <>
    <LocationPicker onUse={applyLocation} />
    <fieldset className="address-label-picker">
      <legend>Save as</legend>
      {(["Home", "Work", "Other"] as const).map(label => (
        <label key={label} className={value.label === label ? "selected" : ""}>
          <input type="radio" name={`${idPrefix}-label`} value={label} checked={value.label === label} onChange={() => onChange({ ...value, label })} />{label}
        </label>
      ))}
    </fieldset>
    <label>Full name<input required minLength={2} maxLength={160} autoComplete="name" spellCheck={false} enterKeyHint="next" value={value.fullName} onChange={set("fullName")} /></label>
    <label>Mobile number<input required type="tel" inputMode="tel" minLength={10} maxLength={16} autoComplete="tel" spellCheck={false} enterKeyHint="next" value={value.phone} onChange={e => onChange({ ...value, phone: e.target.value.replace(/[^\d+ ]/g, "") })} /></label>
    <label>Area, building and street<textarea required minLength={8} maxLength={500} autoComplete="street-address" value={value.address} onChange={set("address")} /></label>
    <label className="pin-field">PIN code<input required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} autoComplete="postal-code" spellCheck={false} enterKeyHint="next" aria-describedby={`${idPrefix}-pin-status`} value={value.pincode} onChange={e => changePin(e.target.value)} />
      <span id={`${idPrefix}-pin-status`} className={`pin-status ${pinStatus?.kind ?? ""}`} aria-live="polite">{pinStatus?.kind === "found" && <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3.5 8.5 6.5 11.5 12.5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}{pinStatus?.text ?? "City and state fill in from the PIN."}</span>
    </label>
    <div className="address-row">
      <label>City or district<input required maxLength={100} autoComplete="address-level2" enterKeyHint="next" value={value.city} onChange={set("city")} /></label>
      <label>State<input required maxLength={100} autoComplete="address-level1" enterKeyHint="next" list={`${idPrefix}-states`} value={value.state} onChange={set("state")} /></label>
    </div>
    <datalist id={`${idPrefix}-states`}>{INDIAN_STATES.map(state => <option key={state} value={state} />)}</datalist>
    <label>Landmark (optional)<input maxLength={200} autoComplete="off" enterKeyHint="next" value={value.landmark} onChange={set("landmark")} /></label>
    <label>Delivery instructions (optional)<textarea maxLength={300} autoComplete="off" enterKeyHint="done" value={value.instructions} onChange={set("instructions")} /></label>
  </>;
}
