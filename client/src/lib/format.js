const currency = new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' });
export const money = (cents) => currency.format(Number(cents || 0) / 100);
export const dollars = (cents) => (Number(cents || 0) / 100).toFixed(2);
export const label = (value) => String(value ?? '').replaceAll('_', ' ');
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

// Parse digits directly so 0.29 becomes exactly 29 cents.
export function toCents(value) {
  const input = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(input)) throw new Error('Enter a nonnegative SGD amount with at most two decimal places.');
  const [whole, fraction = ''] = input.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) throw new Error('This amount is too large.');
  return cents;
}
