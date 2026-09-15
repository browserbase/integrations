export function assertCardNumberForCheckout(number) {
  let sum = 0;
  if (typeof number === "string" && /^\d{12,19}$/.test(number)) {
    for (let i = number.length - 1, position = 0; i >= 0; i--, position++) {
      let digit = Number(number[i]);
      if (position % 2 === 1) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    if (sum % 10 === 0) return;
  }
  // A test credential can fail a checkout form's card-number validation.
  // Do not alter a returned credential or silently substitute a different card.
  throw Object.assign(
    new Error("Payment credential failed card-number validation"),
    {
      code: "INVALID_PAYMENT_CREDENTIAL",
    },
  );
}
