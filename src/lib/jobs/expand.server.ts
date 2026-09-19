/**
 * CJDE — Query expansion + relevance scoring.
 *
 * A single role title ("supply chain manager") only reaches a fraction of the
 * postings a person could apply to, because employers title the same job a dozen
 * different ways. We expand one seed into a family of real-world title variants
 * and run them all in parallel, then score what comes back so weak matches are
 * dropped instead of padding the feed.
 */

/** Domain families: any seed containing the key also searches the variants. */
const DOMAIN_SYNONYMS: Record<string, string[]> = {
  "supply chain": ["logistics", "procurement", "demand planning", "inventory", "warehouse operations"],
  logistics: ["supply chain", "freight", "transportation", "distribution", "warehouse"],
  procurement: ["purchasing", "sourcing", "buyer", "vendor management"],
  warehouse: ["distribution center", "fulfillment", "inventory"],
  operations: ["business operations", "operational excellence", "process improvement"],
  "software engineer": ["software developer", "backend engineer", "frontend engineer", "full stack developer"],
  developer: ["software engineer", "programmer", "full stack developer"],
  data: ["data analyst", "data scientist", "business intelligence", "analytics"],
  marketing: ["digital marketing", "growth marketing", "brand", "performance marketing"],
  sales: ["business development", "account executive", "account manager", "key account"],
  accountant: ["accounting", "finance", "financial analyst", "bookkeeper"],
  finance: ["financial analyst", "fp&a", "controller", "accounting"],
  hr: ["human resources", "talent acquisition", "recruiter", "people operations"],
  "human resources": ["hr", "talent acquisition", "people operations"],
  "customer service": ["customer support", "customer success", "client services"],
  design: ["ux designer", "ui designer", "product designer", "graphic designer"],
  product: ["product manager", "product owner", "program manager"],
  project: ["project manager", "program manager", "delivery manager"],
  engineer: ["engineering"],
  teacher: ["instructor", "tutor", "trainer"],
  nurse: ["nursing", "healthcare"],
};

/** Seniority words we can swap to widen the same role one level up and down. */
const LEVEL_WORDS = ["manager", "specialist", "coordinator", "lead", "supervisor", "director", "officer", "executive", "analyst", "head"];

const LEVEL_SWAPS: Record<string, string[]> = {
  manager: ["lead", "supervisor", "head"],
  specialist: ["coordinator", "officer", "analyst"],
  coordinator: ["specialist", "officer", "administrator"],
  lead: ["manager", "supervisor"],
  supervisor: ["manager", "team lead"],
  director: ["head", "senior manager"],
  officer: ["specialist", "coordinator"],
  executive: ["specialist", "officer"],
  analyst: ["specialist", "consultant"],
  head: ["director", "manager"],
};

function clean(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Expand seed role titles into a wider family of real job titles.
 * Deterministic and cheap — no AI call, so a deep search stays fast.
 */
export function expandQueries(seeds: string[], max = 14): string[] {
  const out: string[] = [];
  const push = (value: string) => {
    const v = clean(value);
    if (v.length > 2 && !out.includes(v)) out.push(v);
  };

  for (const seed of seeds.map(clean).filter(Boolean)) {
    push(seed);

    // 1. Base role without the seniority word ("supply chain manager" -> "supply chain").
    const words = seed.split(" ");
    const levelWord = words.find((w) => LEVEL_WORDS.includes(w));
    const base = levelWord ? words.filter((w) => w !== levelWord && w !== "senior" && w !== "junior").join(" ") : seed;
    if (base && base !== seed) push(base);

    // 2. Same base, other seniority titles.
    if (levelWord && base) {
      for (const swap of LEVEL_SWAPS[levelWord] ?? []) push(`${base} ${swap}`);
    }

    // 3. Neighbouring domains, carrying the seniority word when there was one.
    for (const [key, variants] of Object.entries(DOMAIN_SYNONYMS)) {
      if (!seed.includes(key)) continue;
      for (const variant of variants) push(levelWord ? `${variant} ${levelWord}` : variant);
    }
  }

  return out.slice(0, max);
}

/** Words so common in job titles that matching on them alone means nothing. */
const GENERIC = new Set([
  "manager", "senior", "junior", "lead", "head", "director", "officer", "specialist", "executive",
  "assistant", "associate", "coordinator", "supervisor", "engineer", "analyst", "consultant",
  "the", "and", "for", "remote", "hybrid", "full", "time", "part", "level", "entry", "staff", "new", "job",
]);

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter((w) => w.length > 2);
}

/**
 * How well a job title answers a search, 0..1.
 * A title scores by the share of the query's distinctive words it contains, so
 * "Warehouse Manager" scores high for "warehouse operations manager" while
 * "Sales Manager" scores zero.
 */
export function relevanceScore(title: string, queries: string[]): number {
  const titleTokens = new Set(tokens(title));
  if (titleTokens.size === 0) return 0;
  let best = 0;
  for (const query of queries) {
    const words = tokens(query);
    if (words.length === 0) continue;
    const distinctive = words.filter((w) => !GENERIC.has(w));
    const required = distinctive.length > 0 ? distinctive : words;
    const hits = required.filter((w) => titleTokens.has(w) || [...titleTokens].some((t) => t.startsWith(w) || w.startsWith(t))).length;
    best = Math.max(best, hits / required.length);
  }
  return best;
}
