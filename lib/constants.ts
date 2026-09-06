export const POPULAR_CURRENCIES = [
  { code: "USD", name: "US dollar" },
  { code: "CAD", name: "Canadian dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British pound" },
  { code: "JPY", name: "Japanese yen" },
  { code: "CHF", name: "Swiss franc" },
  { code: "AUD", name: "Australian dollar" },
  { code: "NZD", name: "New Zealand dollar" },
  { code: "CNY", name: "Chinese yuan" },
  { code: "HKD", name: "Hong Kong dollar" },
  { code: "SGD", name: "Singapore dollar" },
  { code: "MXN", name: "Mexican peso" },
  { code: "TRY", name: "Turkish lira" },
  { code: "SEK", name: "Swedish krona" },
  { code: "NOK", name: "Norwegian krone" },
  { code: "DKK", name: "Danish krone" },
  { code: "PLN", name: "Polish zloty" },
  { code: "CZK", name: "Czech koruna" },
  { code: "HUF", name: "Hungarian forint" },
  { code: "RON", name: "Romanian leu" },
] as const

// Frankfurter v2 currencies, kept locally so currency fields open instantly and
// remain usable if its metadata endpoint is temporarily unavailable.
export const FRANKFURTER_CURRENCY_CODES = [
  "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN",
  "BAM", "BBD", "BDT", "BHD", "BIF", "BMD", "BND", "BOB", "BRL", "BSD",
  "BTN", "BWP", "BYN", "BZD", "CAD", "CDF", "CHF", "CLP", "CNH", "CNY",
  "COP", "CRC", "CUP", "CVE", "CZK", "DJF", "DKK", "DOP", "DZD", "EGP",
  "ERN", "ETB", "EUR", "FJD", "FKP", "GBP", "GEL", "GGP", "GHS", "GIP",
  "GMD", "GNF", "GTQ", "GYD", "HKD", "HNL", "HTG", "HUF", "IDR", "ILS",
  "IMP", "INR", "IQD", "IRR", "ISK", "JEP", "JMD", "JOD", "JPY", "KES",
  "KGS", "KHR", "KMF", "KPW", "KRW", "KWD", "KYD", "KZT", "LAK", "LBP",
  "LKR", "LRD", "LSL", "LYD", "MAD", "MDL", "MGA", "MKD", "MMK", "MNT",
  "MOP", "MRO", "MRU", "MUR", "MVR", "MWK", "MXN", "MYR", "MZN", "NAD",
  "NGN", "NIO", "NOK", "NPR", "NZD", "OMR", "PAB", "PEN", "PGK", "PHP",
  "PKR", "PLN", "PYG", "QAR", "RON", "RSD", "RUB", "RWF", "SAR", "SBD",
  "SCR", "SDG", "SEK", "SGD", "SHP", "SLE", "SOS", "SRD", "SSP", "STN",
  "SVC", "SYP", "SZL", "THB", "TJS", "TMT", "TND", "TOP", "TRY", "TTD",
  "TWD", "TZS", "UAH", "UGX", "USD", "UYU", "UZS", "VES", "VND", "VUV",
  "WST", "XAF", "XAG", "XAU", "XCD", "XCG", "XDR", "XOF", "XPD", "XPF",
  "XPT", "YER", "ZAR", "ZMW", "ZWG",
] as const

export const DEFAULT_PINNED_CURRENCIES = ["USD", "CAD", "EUR"] as const

export const RECEIPT_BUCKET = "receipts"
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024
export const RECEIPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const

export const ROOM_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/

export function normalizeRoomCode(value: string) {
  const raw = value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 8)
  return raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw
}
