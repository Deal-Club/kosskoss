import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it, mock } from "node:test";
import {
  DELAI_CAPI_MS,
  donneesUtilisateur,
  envoyerAchatCapi,
  hacherSha256,
  masquerJeton,
  type DependancesCapi,
} from "./capi";

describe("hacherSha256", () => {
  it("produit exactement le SHA-256 attendu", () => {
    assert.equal(
      hacherSha256("anne@example.fr"),
      createHash("sha256").update("anne@example.fr").digest("hex"),
    );
  });

  it("est déterministe : deux appels sur la même valeur rendent le même hachage", () => {
    assert.equal(hacherSha256("237658013646"), hacherSha256("237658013646"));
  });
});

describe("donneesUtilisateur", () => {
  it("hache l'e-mail normalisé (minuscules, sans espaces) — pas la saisie brute", () => {
    const attendu = hacherSha256("anne@example.fr");
    assert.deepEqual(donneesUtilisateur(" Anne@Example.FR ", ""), { em: [attendu] });
  });

  it("réduit le téléphone à ses chiffres avant de le hacher", () => {
    const attendu = hacherSha256("237658013646");
    assert.deepEqual(donneesUtilisateur("", "+237 65 80 13 646"), { ph: [attendu] });
  });

  it("omet un champ vide plutôt que de hacher une chaîne vide", () => {
    assert.deepEqual(donneesUtilisateur("", ""), {});
  });

  it("ne transmet ni nom ni adresse : seuls `em` et `ph` existent sur le résultat", () => {
    const donnees = donneesUtilisateur("anne@example.fr", "237658013646");
    assert.deepEqual(Object.keys(donnees).sort(), ["em", "ph"]);
  });
});

// ── DÉPENDANCES DE TEST ────────────────────────────────────────────────────
//
// Voir l'en-tête de `capi.ts` : `getParametres`/`getIntegrationSecret` tirent
// Prisma en réalité et LÈVENT en test sans `DATABASE_URL`, avalées par le
// `catch` englobant avant même d'atteindre `fetch`. Un test qui se contente
// d'espionner `fetch` global passerait alors même si la garde de consentement
// disparaissait — pour la mauvaise raison (base absente, pas consentement
// refusé). Ces fausses dépendances sont donc délibérément VALIDES (dataset et
// jeton renseignés, réseau qui répondrait 200) : la SEULE chose encore
// capable d'empêcher l'appel à `fetch` dans les tests « sans consentement »
// ci-dessous est la garde elle-même.

const DATASET_VALIDE = "1234567890";
const JETON_VALIDE = "jeton-de-test-abcdefghijklmnop0123456789";

function articleDeTest() {
  return [{ reference: "SKU-1", nom: "Bûches", prixCents: 9500, quantite: 2 }];
}

function achatDeTest(overrides: Partial<Parameters<typeof envoyerAchatCapi>[0]> = {}) {
  return {
    orderNumber: "KOSS-2026-000999",
    email: "anne@example.fr",
    phone: "237658013646",
    totalCents: 19000,
    marketingConsent: false,
    articles: articleDeTest(),
    ...overrides,
  };
}

/** Fetch factice qui répondrait 200 avec un événement confirmé s'il était vraiment appelé. */
function fetchFactice() {
  return mock.fn(async (_url: string, _init?: RequestInit) =>
    new Response(JSON.stringify({ events_received: 1 }), { status: 200 }),
  );
}

function dependancesValides(fetchMock: ReturnType<typeof fetchFactice>): DependancesCapi {
  return {
    getParametres: async () => ({ metaCapiDatasetId: DATASET_VALIDE }),
    getIntegrationSecret: async () => JETON_VALIDE,
    fetch: fetchMock as unknown as typeof fetch,
  };
}

describe("envoyerAchatCapi sans consentement marketing", () => {
  it("n'appelle jamais `fetch`, MÊME avec dataset et jeton valides — c'est la garde, pas l'environnement, qui l'empêche", async () => {
    const fetchMock = fetchFactice();
    await envoyerAchatCapi(achatDeTest({ marketingConsent: false }), dependancesValides(fetchMock));
    assert.equal(fetchMock.mock.callCount(), 0);
  });

  it("ne lit même pas les réglages ni le jeton — la garde coupe avant toute dépendance", async () => {
    const getParametres = mock.fn(async () => ({ metaCapiDatasetId: DATASET_VALIDE }));
    const getIntegrationSecret = mock.fn(async () => JETON_VALIDE);
    await envoyerAchatCapi(achatDeTest({ marketingConsent: false }), {
      getParametres,
      getIntegrationSecret,
      fetch: fetchFactice() as unknown as typeof fetch,
    });
    assert.equal(getParametres.mock.callCount(), 0);
    assert.equal(getIntegrationSecret.mock.callCount(), 0);
  });

  it("ne lève jamais, même en l'absence de consentement", async () => {
    const fetchMock = fetchFactice();
    await assert.doesNotReject(() =>
      envoyerAchatCapi(
        achatDeTest({ email: "", phone: "", totalCents: 0, marketingConsent: false, articles: [] }),
        dependancesValides(fetchMock),
      ),
    );
  });
});

describe("envoyerAchatCapi avec consentement marketing", () => {
  it("appelle `fetch` quand consentement, dataset et jeton sont réunis — la garde ne bloque pas plus qu'il ne faut", async () => {
    const fetchMock = fetchFactice();
    await envoyerAchatCapi(achatDeTest({ marketingConsent: true }), dependancesValides(fetchMock));
    assert.equal(fetchMock.mock.callCount(), 1);
  });

  it("n'appelle pas `fetch` si le dataset n'est pas configuré, même avec consentement", async () => {
    const fetchMock = fetchFactice();
    await envoyerAchatCapi(achatDeTest({ marketingConsent: true }), {
      getParametres: async () => ({ metaCapiDatasetId: "" }),
      getIntegrationSecret: async () => JETON_VALIDE,
      fetch: fetchMock as unknown as typeof fetch,
    });
    assert.equal(fetchMock.mock.callCount(), 0);
  });

  it("n'appelle pas `fetch` si le jeton n'est pas enregistré, même avec consentement", async () => {
    const fetchMock = fetchFactice();
    await envoyerAchatCapi(achatDeTest({ marketingConsent: true }), {
      getParametres: async () => ({ metaCapiDatasetId: DATASET_VALIDE }),
      getIntegrationSecret: async () => null,
      fetch: fetchMock as unknown as typeof fetch,
    });
    assert.equal(fetchMock.mock.callCount(), 0);
  });
});

describe("envoyerAchatCapi — le jeton ne voyage jamais dans l'adresse", () => {
  it("passe `access_token` dans le corps JSON, jamais dans l'URL", async () => {
    const fetchMock = fetchFactice();
    await envoyerAchatCapi(achatDeTest({ marketingConsent: true }), dependancesValides(fetchMock));

    assert.equal(fetchMock.mock.callCount(), 1);
    const [url, init] = fetchMock.mock.calls[0].arguments as [string, RequestInit];
    assert.equal(url.includes(JETON_VALIDE), false, `le jeton apparaît dans l'URL : ${url}`);
    assert.equal(url.includes("access_token"), false, `le paramètre access_token apparaît dans l'URL : ${url}`);

    const corps = JSON.parse(String(init.body)) as { access_token?: string };
    assert.equal(corps.access_token, JETON_VALIDE);
  });

  it("porte un délai d'attente sur l'appel réseau", async () => {
    const fetchMock = fetchFactice();
    await envoyerAchatCapi(achatDeTest({ marketingConsent: true }), dependancesValides(fetchMock));

    const [, init] = fetchMock.mock.calls[0].arguments as [string, RequestInit];
    assert.ok(init.signal instanceof AbortSignal, "un AbortSignal doit accompagner l'appel");
    assert.equal(init.signal?.aborted, false);
    assert.equal(DELAI_CAPI_MS, 3000);
  });
});

describe("masquerJeton", () => {
  it("remplace toute occurrence du jeton par un masque", () => {
    assert.equal(
      masquerJeton(`erreur: access_token=${JETON_VALIDE} invalide`, JETON_VALIDE),
      "erreur: access_token=[jeton masqué] invalide",
    );
  });

  it("ne change rien quand le jeton est null (pas encore lu)", () => {
    assert.equal(masquerJeton("erreur réseau brute", null), "erreur réseau brute");
  });

  it("ne change rien quand le jeton n'apparaît pas dans le texte", () => {
    assert.equal(masquerJeton("erreur sans rapport", JETON_VALIDE), "erreur sans rapport");
  });
});

describe("envoyerAchatCapi — HTTP 200 n'est pas une preuve de réception", () => {
  it("signale un HTTP 200 dont le corps ne confirme aucun événement reçu (events_received manquant)", async () => {
    const fetchMock = mock.fn(async () => new Response("{}", { status: 200 }));
    const erreurs: string[] = [];
    const consoleErrorMock = mock.method(console, "error", (...args: unknown[]) => {
      erreurs.push(args.map(String).join(" "));
    });
    try {
      await envoyerAchatCapi(achatDeTest({ marketingConsent: true }), dependancesValides(fetchMock));
    } finally {
      consoleErrorMock.mock.restore();
    }
    assert.equal(erreurs.length, 1);
    assert.equal(erreurs[0].includes("events_received"), true);
  });

  it("signale un HTTP 200 avec `events_received: 0`", async () => {
    const fetchMock = mock.fn(
      async () => new Response(JSON.stringify({ events_received: 0 }), { status: 200 }),
    );
    const erreurs: string[] = [];
    const consoleErrorMock = mock.method(console, "error", (...args: unknown[]) => {
      erreurs.push(args.map(String).join(" "));
    });
    try {
      await envoyerAchatCapi(achatDeTest({ marketingConsent: true }), dependancesValides(fetchMock));
    } finally {
      consoleErrorMock.mock.restore();
    }
    assert.equal(erreurs.length, 1);
  });

  it("ne signale rien quand `events_received` confirme au moins un événement reçu", async () => {
    const fetchMock = fetchFactice();
    const erreurs: string[] = [];
    const consoleErrorMock = mock.method(console, "error", (...args: unknown[]) => {
      erreurs.push(args.map(String).join(" "));
    });
    try {
      await envoyerAchatCapi(achatDeTest({ marketingConsent: true }), dependancesValides(fetchMock));
    } finally {
      consoleErrorMock.mock.restore();
    }
    assert.equal(erreurs.length, 0);
  });
});

describe("envoyerAchatCapi — les journaux ne portent jamais le jeton en clair", () => {
  it("masque le jeton dans le message journalisé si la réponse Meta le cite", async () => {
    const fetchMock = mock.fn(
      async () => new Response(`{"error":"access_token invalide : ${JETON_VALIDE}"}`, { status: 400 }),
    );
    const erreurs: string[] = [];
    const consoleErrorMock = mock.method(console, "error", (...args: unknown[]) => {
      erreurs.push(args.map(String).join(" "));
    });
    try {
      await envoyerAchatCapi(achatDeTest({ marketingConsent: true }), dependancesValides(fetchMock));
    } finally {
      consoleErrorMock.mock.restore();
    }

    assert.equal(erreurs.length, 1);
    assert.equal(erreurs[0].includes(JETON_VALIDE), false, `le jeton apparaît en clair : ${erreurs[0]}`);
    assert.equal(erreurs[0].includes("[jeton masqué]"), true);
  });

  it("masque le jeton dans le message journalisé si `fetch` lève une erreur qui le cite", async () => {
    const fetchMock = mock.fn(async () => {
      throw new Error(`connexion refusée pour access_token=${JETON_VALIDE}`);
    });
    const erreurs: string[] = [];
    const consoleErrorMock = mock.method(console, "error", (...args: unknown[]) => {
      erreurs.push(args.map(String).join(" "));
    });
    try {
      await envoyerAchatCapi(achatDeTest({ marketingConsent: true }), dependancesValides(fetchMock));
    } finally {
      consoleErrorMock.mock.restore();
    }

    assert.equal(erreurs.length, 1);
    assert.equal(erreurs[0].includes(JETON_VALIDE), false, `le jeton apparaît en clair : ${erreurs[0]}`);
  });
});
