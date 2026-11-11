// The shop's support WhatsApp number. Change it here and every link and mention on the site follows.
export const SUPPORT_WHATSAPP = { digits: "919561579131", display: "+91 95615 79131" };

/** A wa.me link to support, optionally with a prefilled message. */
export const whatsappLink = (message?: string) => `https://wa.me/${SUPPORT_WHATSAPP.digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
