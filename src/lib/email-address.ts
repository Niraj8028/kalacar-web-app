// Email helpers shared by checkout, sign-in and the customer emails.

const GMAIL_DOMAINS = ["gmail.com", "googlemail.com"];

export const normalEmail = (value: string) => value.trim().toLowerCase();
export const isEmail = (value: string) => value.length <= 190 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/** Gmail ignores dots and anything after "+", so ravi.k+shop@gmail.com and ravik@gmail.com are one inbox. Null for other providers. */
export function gmailInbox(email: string) {
  const at = email.lastIndexOf("@");
  if (at < 1 || !GMAIL_DOMAINS.includes(email.slice(at + 1))) return null;
  return email.slice(0, at).split("+")[0].replaceAll(".", "");
}

/** SQL that finds an account by email, treating Gmail spellings of one inbox as the same. Exact matches win. */
export function sameInboxQuery(email: string): { where: string; params: string[] } {
  const inbox = gmailInbox(email);
  if (!inbox) return { where: "email=?", params: [email] };
  return {
    where: "(email=? OR (SUBSTRING_INDEX(email,'@',-1) IN ('gmail.com','googlemail.com') AND REPLACE(SUBSTRING_INDEX(SUBSTRING_INDEX(email,'@',1),'+',1),'.','')=?))",
    params: [email, inbox],
  };
}
