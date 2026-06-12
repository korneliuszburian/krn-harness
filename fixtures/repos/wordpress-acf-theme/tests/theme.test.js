import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { defaultHeroVariant, heroCtaSelector, heroVariantClass } from "../src/theme/assets/hero.js";

const css = readFileSync("src/theme/assets/hero.css", "utf8");
const heroTemplate = readFileSync("src/theme/template-parts/hero.php", "utf8");
const cardGridTemplate = readFileSync("src/theme/template-parts/card-grid.php", "utf8");
const acfGroup = JSON.parse(readFileSync("acf/group_hero.json", "utf8"));

assert.equal(defaultHeroVariant, "classic");
assert.equal(heroVariantClass(), "hero--classic");
assert.equal(heroCtaSelector, "[data-hero-cta]");
assert.match(css, /\.hero--classic\b/);
assert.match(css, /min-height:\s*520px/);
assert.match(css, /min-height:\s*320px/);
assert.match(css, /gap:\s*24px/);
assert.match(heroTemplate, /data-hero-section/);
assert.match(heroTemplate, /data-hero-cta/);
assert.match(cardGridTemplate, /data-card-grid/);
assert.equal(acfGroup.key, "group_hero");
assert.deepEqual(acfGroup.fields.map((field) => field.name).sort(), [
  "hero_headline",
  "hero_variant",
]);
