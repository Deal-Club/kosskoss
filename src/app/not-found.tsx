import Link from "next/link";

/**
 * Page 404 de dernier recours, hors de tout contexte de langue.
 *
 * ── POURQUOI ELLE EXISTE À CÔTÉ DE CELLE DE LA BOUTIQUE ─────────────────────
 *
 * `src/app/[locale]/not-found.tsx` couvre les adresses inconnues de la
 * boutique, avec l'en-tête, le pied de page et la langue du visiteur. Mais
 * toutes les adresses ne passent pas par ce segment : le back-office, le flux
 * Merchant, les liens de campagne et les fichiers vivent en dehors.
 *
 * Sans ce fichier, Next.js sert son propre écran pour ces chemins-là : anglais,
 * sans marque, sans issue. Celle-ci est volontairement sobre — elle ne peut
 * charger ni traductions ni chrome, faute de contexte de langue — mais elle
 * porte le nom de la boutique et une porte de sortie.
 */
export default function PageIntrouvableRacine() {
  return (
    <main
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
        color: "#1E1E1E",
      }}
    >
      <p style={{ fontSize: "0.75rem", letterSpacing: "0.12em", color: "#8a7a5c" }}>404</p>
      <h1 style={{ marginTop: "0.75rem", fontSize: "1.75rem", color: "#0F3B46" }}>
        Cette page n’existe pas
      </h1>
      <p style={{ marginTop: "1rem", maxWidth: "32rem", lineHeight: 1.6 }}>
        Le lien que vous avez suivi ne mène nulle part.
        <br />
        <span style={{ fontSize: "0.9rem", opacity: 0.75 }}>
          The link you followed leads nowhere.
        </span>
      </p>
      <Link
        href="/"
        style={{
          marginTop: "2rem",
          borderRadius: "9999px",
          background: "#0F3B46",
          color: "#fff",
          padding: "0.875rem 1.75rem",
          fontSize: "0.875rem",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        KossKoss Select
      </Link>
    </main>
  );
}
