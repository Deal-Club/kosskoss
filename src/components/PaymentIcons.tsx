import type { ComponentType } from "react";

// Logos des moyens de paiement acceptés.
//
// Chaque marque est dessinée en SVG inline, au même gabarit 48 × 32 (format
// carte) : la rangée reste alignée quels que soient les moyens activés dans le
// back-office. Les couleurs sont celles des marques ; le fond blanc et le filet
// gris permettent de poser les logos aussi bien sur le fond clair de la fiche
// produit que sur le pied de page sombre.
//
// Les marques sont rendues au trait plutôt que reprises des fichiers officiels :
// une forme distinctive (les deux disques Mastercard) ou le nom posé dans la
// couleur de la marque suffisent à les reconnaître, sans embarquer d'actif dont
// l'usage est encadré.
//
// Les moyens de paiement sont créés librement dans /admin/payments : quand la
// clé n'est pas connue ici, `brandMarksFor` renvoie null et la barre retombe
// sur le pictogramme lucide enregistré avec le moyen de paiement.

const FRAME = "h-8 w-12 shrink-0";

/** Cadre commun : fond blanc, coins légèrement arrondis, filet discret. */
function Card({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <svg
      viewBox="0 0 48 32"
      className={FRAME}
      role="img"
      aria-label={label}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0.5" y="0.5" width="47" height="31" rx="3" fill="#ffffff" stroke="#e2e2e2" />
      {children}
    </svg>
  );
}

/** Nom de marque centré : le rendu ne dépend d'aucune police particulière. */
function Wordmark({
  children,
  fill,
  fontSize = 11,
  y = 20,
  fontStyle,
  letterSpacing,
}: {
  children: string;
  fill: string;
  fontSize?: number;
  y?: number;
  fontStyle?: "italic";
  letterSpacing?: number;
}) {
  return (
    <text
      x="24"
      y={y}
      textAnchor="middle"
      fontFamily="Helvetica, Arial, sans-serif"
      fontSize={fontSize}
      fontWeight="700"
      fontStyle={fontStyle}
      letterSpacing={letterSpacing}
      fill={fill}
    >
      {children}
    </text>
  );
}

export function VisaMark() {
  return (
    <Card label="Visa">
      <Wordmark fill="#1434CB" fontStyle="italic" letterSpacing={0.5}>
        VISA
      </Wordmark>
    </Card>
  );
}

export function MastercardMark() {
  return (
    <Card label="Mastercard">
      {/* Les deux disques qui se chevauchent : la marque se reconnaît à la forme seule */}
      <circle cx="20" cy="16" r="7.5" fill="#EB001B" />
      <circle cx="28" cy="16" r="7.5" fill="#F79E1B" />
      <path
        d="M24 10.2a7.5 7.5 0 0 0 0 11.6 7.5 7.5 0 0 0 0-11.6Z"
        fill="#FF5F00"
      />
    </Card>
  );
}

export function AmexMark() {
  return (
    <Card label="American Express">
      <rect x="3" y="3" width="42" height="26" rx="2" fill="#006FCF" />
      <text
        x="24"
        y="15"
        textAnchor="middle"
        fontFamily="Helvetica, Arial, sans-serif"
        fontSize="6.5"
        fontWeight="700"
        fill="#ffffff"
      >
        AMERICAN
      </text>
      <text
        x="24"
        y="23"
        textAnchor="middle"
        fontFamily="Helvetica, Arial, sans-serif"
        fontSize="6.5"
        fontWeight="700"
        fill="#ffffff"
      >
        EXPRESS
      </text>
    </Card>
  );
}

export function PaypalMark() {
  return (
    <Card label="PayPal">
      {/* Bicolore comme le logotype : « Pay » foncé, « Pal » clair */}
      <text
        x="24"
        y="20"
        textAnchor="middle"
        fontFamily="Helvetica, Arial, sans-serif"
        fontSize="10"
        fontWeight="700"
        fontStyle="italic"
      >
        <tspan fill="#003087">Pay</tspan>
        <tspan fill="#009CDE">Pal</tspan>
      </text>
    </Card>
  );
}

export function SepaMark() {
  return (
    <Card label="Prélèvement SEPA">
      <Wordmark fill="#10298E" fontSize={10} y={15} letterSpacing={0.5}>
        SEPA
      </Wordmark>
      <text
        x="24"
        y="24"
        textAnchor="middle"
        fontFamily="Helvetica, Arial, sans-serif"
        fontSize="5.5"
        fontWeight="600"
        letterSpacing="0.2"
        fill="#6b7280"
      >
        PRÉLÈVEMENT
      </text>
    </Card>
  );
}

export function SofortMark() {
  return (
    <Card label="Virement instantané">
      <Wordmark fill="#EF809F" fontSize={10} letterSpacing={-0.2}>
        SOFORT
      </Wordmark>
    </Card>
  );
}

export function InvoiceMark() {
  return (
    <Card label="Paiement sur facture">
      {/* Feuille de facture : quelques lignes et le montant en euros */}
      <rect
        x="16"
        y="7"
        width="16"
        height="18"
        rx="1.5"
        fill="#ffffff"
        stroke="#1f2937"
        strokeWidth="1.4"
      />
      <path
        d="M19.5 12h9M19.5 15.5h9M19.5 19h5"
        stroke="#1f2937"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <text
        x="26.5"
        y="23.5"
        fontFamily="Helvetica, Arial, sans-serif"
        fontSize="6.5"
        fontWeight="700"
        fill="#e3000e"
      >
        €
      </text>
    </Card>
  );
}

export function KlarnaMark() {
  return (
    <Card label="Klarna">
      <rect x="3" y="3" width="42" height="26" rx="2" fill="#FFB3C7" />
      <Wordmark fill="#0B051D" fontSize={10}>
        Klarna
      </Wordmark>
    </Card>
  );
}

export function ApplePayMark() {
  return (
    <Card label="Apple Pay">
      <Wordmark fill="#000000" fontSize={9.5}>
        Apple Pay
      </Wordmark>
    </Card>
  );
}

export function GooglePayMark() {
  return (
    <Card label="Google Pay">
      <text
        x="24"
        y="20"
        textAnchor="middle"
        fontFamily="Helvetica, Arial, sans-serif"
        fontSize="9.5"
        fontWeight="700"
      >
        <tspan fill="#4285F4">G</tspan>
        <tspan fill="#5F6368"> Pay</tspan>
      </text>
    </Card>
  );
}

type Mark = ComponentType;

/**
 * Marques à afficher pour un moyen de paiement du back-office.
 *
 * La correspondance se fait sur la clé, puis sur le nom du pictogramme lucide :
 * un moyen créé à la main avec l'icône « credit-card » montre donc quand même
 * les logos des cartes. Retourne null quand rien n'est reconnu — l'appelant
 * retombe alors sur le pictogramme.
 */
export function brandMarksFor(key: string, icon: string): Mark[] | null {
  const normalized = key.trim().toLowerCase();

  // Virement bancaire : pas de logo de marque, on laisse l'appelant afficher le
  // pictogramme « banque » et le libellé du moyen de paiement.
  if (["banque", "virement", "virement-bancaire"].includes(normalized)) return null;

  const byKey: Record<string, Mark[]> = {
    rechnung: [InvoiceMark],
    paypal: [PaypalMark],
    kreditkarte: [VisaMark, MastercardMark, AmexMark],
    creditcard: [VisaMark, MastercardMark, AmexMark],
    "carte-bancaire": [VisaMark, MastercardMark, AmexMark],
    cartebancaire: [VisaMark, MastercardMark, AmexMark],
    visa: [VisaMark],
    mastercard: [MastercardMark],
    amex: [AmexMark],
    lastschrift: [SepaMark],
    sepa: [SepaMark],
    sofort: [SofortMark],
    klarna: [KlarnaMark],
    applepay: [ApplePayMark],
    "apple-pay": [ApplePayMark],
    googlepay: [GooglePayMark],
    "google-pay": [GooglePayMark],
  };

  if (byKey[normalized]) return byKey[normalized];

  // Repli sur le pictogramme choisi dans le back-office
  const byIcon: Record<string, Mark[]> = {
    "credit-card": [VisaMark, MastercardMark],
    "file-text": [InvoiceMark],
    wallet: [PaypalMark],
    banknote: [SepaMark],
    zap: [SofortMark],
  };

  return byIcon[icon] ?? null;
}
