export function formatInvoiceTotal(cents: number): string {
  const wholeDollars = Math.round(cents / 100);

  return `$${wholeDollars}.00`;
}
