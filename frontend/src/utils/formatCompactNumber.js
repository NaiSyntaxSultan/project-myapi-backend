const COMPACT_NUMBER_UNITS = [
  "",
  "k",
  "M",
  "B",
  "T",
  "Qa",
  "Qi",
  "Sx",
  "Sp",
  "Oc",
  "No",
  "Dc",
];

const trimTrailingZero = (value) => {
  const absoluteValue = Math.abs(value);
  const decimalPlaces = absoluteValue >= 100 ? 0 : absoluteValue >= 10 ? 1 : 2;

  return Number(value.toFixed(decimalPlaces)).toString();
};

export const formatCompactNumber = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) return "0";

  const absoluteNumber = Math.abs(number);
  if (absoluteNumber < 1_000) return number.toLocaleString("en-US");

  let unitIndex = Math.min(
    Math.floor(Math.log10(absoluteNumber) / 3),
    COMPACT_NUMBER_UNITS.length - 1,
  );
  let compactValue = number / 1_000 ** unitIndex;

  // Promote values such as 999,999 to 1M instead of displaying 1000k.
  if (
    Math.abs(Number(trimTrailingZero(compactValue))) >= 1_000 &&
    unitIndex < COMPACT_NUMBER_UNITS.length - 1
  ) {
    unitIndex += 1;
    compactValue = number / 1_000 ** unitIndex;
  }

  if (
    unitIndex === COMPACT_NUMBER_UNITS.length - 1 &&
    Math.abs(compactValue) >= 1_000
  ) {
    return number.toExponential(2).replace(/\.?0+e/, "e");
  }

  return `${trimTrailingZero(compactValue)}${COMPACT_NUMBER_UNITS[unitIndex]}`;
};
