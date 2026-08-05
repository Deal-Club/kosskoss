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

const ROUGE = "#e3000e";

export const PAGE_MAINTENANCE = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Maintenance en cours — MLC Bois</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: #f5f5f5;
    color: #242424;
    font-family: "Lato", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.6;
  }
  .carte {
    width: 100%;
    max-width: 520px;
    background: #ffffff;
    border-top: 4px solid ${ROUGE};
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
  .marque span { color: ${ROUGE}; }
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
    color: ${ROUGE};
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
    <p class="marque">MLC <span>Bois</span></p>
    <h1>Nous revenons dans un instant</h1>
    <p>La boutique est en cours de maintenance. L'ensemble du catalogue sera de nouveau accessible sous peu.</p>
    <p>Merci de votre patience.</p>
    <p class="contact">
      Une question ? Écrivez-nous à
      <a href="mailto:contact@mlc-bois.fr">contact@mlc-bois.fr</a>
    </p>
  </main>
</body>
</html>
`;
