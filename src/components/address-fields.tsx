"use client";

import { useRef } from "react";
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

/** Controlled delivery-address inputs shared by checkout and the account address book. */
export function AddressFields({ value, onChange, idPrefix }: { value: AddressDraft; onChange: (next: AddressDraft) => void; idPrefix: string }) {
  const set = (key: keyof AddressDraft) => (event: { target: { value: string } }) => onChange({ ...value, [key]: event.target.value });
  // Values last filled from the map; a field is only replaced if it is empty or still holds that value,
  // so anything the customer typed themselves is never overwritten.
  const autofilled = useRef<Partial<Record<"address" | "city" | "state" | "pincode", string>>>({});
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
    <div className="address-row">
      <label>City or district<input required maxLength={100} autoComplete="address-level2" enterKeyHint="next" value={value.city} onChange={set("city")} /></label>
      <label>State<input required maxLength={100} autoComplete="address-level1" enterKeyHint="next" value={value.state} onChange={set("state")} /></label>
    </div>
    <label>PIN code<input required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} autoComplete="postal-code" spellCheck={false} enterKeyHint="next" value={value.pincode} onChange={e => onChange({ ...value, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} /></label>
    <label>Landmark (optional)<input maxLength={200} autoComplete="off" enterKeyHint="next" value={value.landmark} onChange={set("landmark")} /></label>
    <label>Delivery instructions (optional)<textarea maxLength={300} autoComplete="off" enterKeyHint="done" value={value.instructions} onChange={set("instructions")} /></label>
  </>;
}
