export type TaxRegion = "standard" | "reduced";

const rates: Record<TaxRegion, number> = {
  standard: 0.1,
  reduced: 0.05,
};

export function calculateRegionalTax(cents: number, region: TaxRegion): number {
  return Math.round(cents * rates[region]);
}
