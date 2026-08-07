/**
 * Page d'attente servie pendant la maintenance.
 *
 * Volontairement une chaîne HTML autonome plutôt qu'une route Next : elle est
 * rendue depuis le proxy, avant tout routage. Aucune base, aucune traduction,
 * aucun composant — donc rien qui puisse tomber en même temps que ce qu'on est
 * en train de réparer. Les styles sont en ligne pour la même raison : la
 * feuille compilée peut très bien être ce qui manque.
 *
 * Le texte est en français, comme la boutique.
 */

// Bleu Profond et Beige Sable de la charte KossKoss Select. Volontairement
// recopiés ici plutôt qu'importés de config/brand : cette page doit tenir
// debout même si le reste de l'application ne se charge pas.
const BLEU_PROFOND = "#0f3b46";
const SABLE = "#f3e8dd";

export const PAGE_MAINTENANCE = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Maintenance en cours — KossKoss Select</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: ${SABLE};
    color: #242424;
    font-family: "Lato", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.6;
  }
  .carte {
    width: 100%;
    max-width: 520px;
    background: #ffffff;
    border-top: 4px solid ${BLEU_PROFOND};
    border-radius: 4px;
    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
    padding: 48px 40px;
    text-align: center;
  }
  .marque {
    font-size: 22px;
    font-weight: 900;
    letter-spacing: -0.01em;
    margin: 0 0 32px;
  }
  .marque span { color: ${BLEU_PROFOND}; }
  h1 {
    font-size: 26px;
    font-weight: 700;
    margin: 0 0 16px;
  }
  p {
    margin: 0 0 16px;
    color: #555555;
  }
  p:last-child { margin-bottom: 0; }
  .contact {
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid #e6e6e6;
    font-size: 14px;
  }
  .contact a {
    color: ${BLEU_PROFOND};
    text-decoration: none;
    font-weight: 700;
  }
  .contact a:hover { text-decoration: underline; }
  @media (max-width: 480px) {
    .carte { padding: 36px 24px; }
    h1 { font-size: 22px; }
  }
</style>
</head>
<body>
  <main class="carte">
    <p class="marque">KOSSKOSS <span>SELECT</span></p>
    <h1>Nous revenons dans un instant</h1>
    <p>La boutique est en cours de maintenance. L'ensemble du catalogue sera de nouveau accessible sous peu.</p>
    <p>Merci de votre patience.</p>
    <p class="contact">
      Une question ? Appelez-nous au
      <a href="tel:+237658013646">+237 658 01 36 46</a>
    </p>
  </main>
</body>
</html>
`;
