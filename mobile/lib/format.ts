const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"] as const;

/** Convert any western digits in a value to Bangla digits: 105 → ১০৫ */
export function bn(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

/** ৳ amount with Indian-style grouping in Bangla digits: 12500 → ৳১২,৫০০ */
export function taka(amount: number | string): string {
  const n = Math.round(Number(amount));
  const sign = n < 0 ? "-" : "";
  return `${sign}৳${bn(Math.abs(n).toLocaleString("en-IN"))}`;
}

const BN_MONTHS = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
] as const;

/** 2026-08-07 → ৭ আগস্ট ২০২৬ */
export function bnDate(value: string | Date): string {
  const d = new Date(value);
  return `${bn(d.getDate())} ${BN_MONTHS[d.getMonth()]} ${bn(d.getFullYear())}`;
}

export function rateUnitLabel(unit: "DAILY" | "MONTHLY" | "FLAT"): string {
  if (unit === "FLAT") return "এককালীন";
  return unit === "DAILY" ? "দৈনিক" : "মাসিক";
}

export function statusLabel(status: "ACTIVE" | "PARTIAL" | "RETURNED"): string {
  switch (status) {
    case "ACTIVE":
      return "চলমান";
    case "PARTIAL":
      return "আংশিক ফেরত";
    case "RETURNED":
      return "ফেরত সম্পন্ন";
  }
}
