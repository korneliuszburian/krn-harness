export const heroCtaSelector = "[data-hero-cta]";
export const defaultHeroVariant = "classic";

export function heroVariantClass(variant = defaultHeroVariant) {
  return `hero--${variant}`;
}
