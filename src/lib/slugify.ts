export function slugify(value: string): string {
  return value
    .toLowerCase()
    // Les ligatures françaises n'ont pas de décomposition Unicode : sans ces
    // deux lignes, « cœur » donnerait « cur » et « œuvre » « uvre ».
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
