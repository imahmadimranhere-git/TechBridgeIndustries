// Pakistan ke liye default country code 92
export function toWhatsAppNumber(phone, defaultCountryCode = "92") {
  if (!phone) return "";

  // Sirf digits rakho
  let digits = String(phone).replace(/\D/g, "");

  // 00 se start ho to hata do (e.g. 0092...)
  if (digits.startsWith("00")) digits = digits.slice(2);

  // Local format 03xx... ko 923xx... mein convert karo
  if (digits.startsWith("0")) digits = defaultCountryCode + digits.slice(1);

  return digits;
}

export function whatsappLink(phone, message = "") {
  const number = toWhatsAppNumber(phone);
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${number}${text}`;
}