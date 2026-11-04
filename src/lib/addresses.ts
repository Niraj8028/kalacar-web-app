import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { addressDb } from "@/lib/catalogue-db";

export const MAX_ADDRESSES = 10;
export const ADDRESS_LABELS = ["Home", "Work", "Other"] as const;
export type AddressLabel = (typeof ADDRESS_LABELS)[number];

export type AddressInput = {
  label: AddressLabel; fullName: string; phone: string; address: string; city: string;
  state: string; landmark: string; instructions: string; pincode: string;
};
export type SavedAddress = AddressInput & { id: string; isDefault: boolean };

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Validates and normalises an address from untrusted input. Returns an error message or the address. */
export function parseAddress(raw: unknown): { error: string } | { value: AddressInput } {
  if (!raw || typeof raw !== "object") return { error: "Enter the delivery address." };
  const body = raw as Record<string, unknown>;
  const label = (ADDRESS_LABELS as readonly string[]).includes(text(body.label)) ? (text(body.label) as AddressLabel) : "Home";
  const value: AddressInput = {
    label,
    fullName: text(body.fullName ?? body.name),
    phone: text(body.phone).replace(/[^\d+]/g, ""),
    address: text(body.address),
    city: text(body.city),
    state: text(body.state),
    landmark: text(body.landmark),
    instructions: text(body.instructions),
    pincode: text(body.pincode).replace(/\D/g, ""),
  };
  if (value.fullName.length < 2 || value.fullName.length > 160) return { error: "Enter the recipient's full name." };
  const digits = value.phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return { error: "Enter a valid 10-digit mobile number." };
  if (value.address.length < 8 || value.address.length > 500) return { error: "Enter the area, building and street (at least 8 characters)." };
  if (!value.city || value.city.length > 100) return { error: "Enter the city or district." };
  if (!value.state || value.state.length > 100) return { error: "Enter the state." };
  if (value.landmark.length > 200) return { error: "Landmark must be 200 characters or fewer." };
  if (value.instructions.length > 300) return { error: "Delivery instructions must be 300 characters or fewer." };
  if (!/^[1-9]\d{5}$/.test(value.pincode)) return { error: "Enter a valid 6-digit PIN code." };
  return { value };
}

type AddressRow = RowDataPacket & {
  id: string; label: AddressLabel; full_name: string; phone: string; address: string; city: string;
  state: string; landmark: string; instructions: string; pincode: string; is_default: number;
};
const toAddress = (row: AddressRow): SavedAddress => ({
  id: row.id, label: row.label, fullName: row.full_name, phone: row.phone, address: row.address, city: row.city,
  state: row.state, landmark: row.landmark, instructions: row.instructions, pincode: row.pincode, isDefault: Boolean(row.is_default),
});

export async function listAddresses(userId: string) {
  const db = await addressDb();
  const [rows] = await db.execute<AddressRow[]>("SELECT * FROM kalacar_addresses WHERE user_id=? ORDER BY is_default DESC, updated_at DESC", [userId]);
  return rows.map(toAddress);
}

/** Same delivery details already saved? (Used to avoid duplicates when saving from checkout.) */
export async function findMatchingAddress(userId: string, input: AddressInput) {
  return (await listAddresses(userId)).find(saved =>
    (["fullName", "phone", "address", "city", "state", "landmark", "instructions", "pincode"] as const)
      .every(key => saved[key].toLowerCase() === input[key].toLowerCase())) ?? null;
}

export async function createAddress(userId: string, input: AddressInput, makeDefault: boolean) {
  const db = await addressDb();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    // Lock this user's rows so the 10-address limit and single default hold under concurrent requests.
    const [existing] = await connection.execute<(RowDataPacket & { id: string })[]>("SELECT id FROM kalacar_addresses WHERE user_id=? FOR UPDATE", [userId]);
    if (existing.length >= MAX_ADDRESSES) { await connection.rollback(); return { error: `You can save up to ${MAX_ADDRESSES} addresses. Delete one to add another.` } as const; }
    const isDefault = makeDefault || existing.length === 0;
    if (isDefault) await connection.execute("UPDATE kalacar_addresses SET is_default=0 WHERE user_id=?", [userId]);
    const id = randomUUID();
    await connection.execute(
      "INSERT INTO kalacar_addresses (id,user_id,label,full_name,phone,address,city,state,landmark,instructions,pincode,is_default) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      [id, userId, input.label, input.fullName, input.phone, input.address, input.city, input.state, input.landmark, input.instructions, input.pincode, isDefault ? 1 : 0],
    );
    await connection.commit();
    return { value: { ...input, id, isDefault } } as const;
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

export async function updateAddress(userId: string, id: string, input: AddressInput | null, makeDefault: boolean) {
  const db = await addressDb();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<AddressRow[]>("SELECT * FROM kalacar_addresses WHERE id=? AND user_id=? FOR UPDATE", [id, userId]);
    if (!rows[0]) { await connection.rollback(); return null; }
    if (input) await connection.execute(
      "UPDATE kalacar_addresses SET label=?,full_name=?,phone=?,address=?,city=?,state=?,landmark=?,instructions=?,pincode=? WHERE id=? AND user_id=?",
      [input.label, input.fullName, input.phone, input.address, input.city, input.state, input.landmark, input.instructions, input.pincode, id, userId],
    );
    if (makeDefault) {
      await connection.execute("UPDATE kalacar_addresses SET is_default=0 WHERE user_id=?", [userId]);
      await connection.execute("UPDATE kalacar_addresses SET is_default=1 WHERE id=? AND user_id=?", [id, userId]);
    }
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
  return (await listAddresses(userId)).find(address => address.id === id) ?? null;
}

/** Deletes an address; if it was the default, the most recently used remaining address becomes default. */
export async function deleteAddress(userId: string, id: string) {
  const db = await addressDb();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<AddressRow[]>("SELECT * FROM kalacar_addresses WHERE id=? AND user_id=? FOR UPDATE", [id, userId]);
    if (!rows[0]) { await connection.rollback(); return false; }
    await connection.execute("DELETE FROM kalacar_addresses WHERE id=? AND user_id=?", [id, userId]);
    if (rows[0].is_default) {
      const [next] = await connection.execute<(RowDataPacket & { id: string })[]>("SELECT id FROM kalacar_addresses WHERE user_id=? ORDER BY updated_at DESC LIMIT 1", [userId]);
      if (next[0]) await connection.execute("UPDATE kalacar_addresses SET is_default=1 WHERE id=?", [next[0].id]);
    }
    await connection.commit();
    return true;
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
