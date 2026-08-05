// Freins contre les tentatives automatisées sur l'espace client.
//
// Même principe que src/server/loginRate.ts (compteur en mémoire, suffisant
// pour une instance unique), mais des compteurs distincts : un client qui se
// trompe de mot de passe ne doit pas peser sur le back-office, et inversement.
// Avec plusieurs instances, il faudra déplacer ces compteurs dans Redis.

interface Attempt {
  count: number;
  firstFailureAt: number;
}

interface Limiter {
  check(key: string): { allowed: boolean; retryAfterSeconds: number };
  register(key: string): void;
  reset(key: string): void;
}

function createLimiter(maxAttempts: number, windowMs: number): Limiter {
  const attempts = new Map<string, Attempt>();

  function normalize(key: string): string {
    return key.trim().toLowerCase();
  }

  return {
    check(key) {
      const entry = attempts.get(normalize(key));
      if (!entry) return { allowed: true, retryAfterSeconds: 0 };

      const elapsed = Date.now() - entry.firstFailureAt;
      if (elapsed > windowMs) {
        attempts.delete(normalize(key));
        return { allowed: true, retryAfterSeconds: 0 };
      }

      if (entry.count < maxAttempts) return { allowed: true, retryAfterSeconds: 0 };
      return { allowed: false, retryAfterSeconds: Math.ceil((windowMs - elapsed) / 1000) };
    },

    register(key) {
      const normalized = normalize(key);
      const entry = attempts.get(normalized);
      if (!entry || Date.now() - entry.firstFailureAt > windowMs) {
        attempts.set(normalized, { count: 1, firstFailureAt: Date.now() });
        return;
      }
      entry.count += 1;
    },

    reset(key) {
      attempts.delete(normalize(key));
    },
  };
}

/** Connexion : cinq échecs par adresse, puis quinze minutes de blocage. */
const login = createLimiter(5, 15 * 60 * 1000);

/**
 * Mot de passe oublié : trois demandes par adresse et par heure.
 * Le compteur s'incrémente que l'adresse existe ou non — sinon le simple fait
 * d'être bloqué révélerait l'existence du compte.
 */
const reset = createLimiter(3, 60 * 60 * 1000);

/** Inscription : cinq envois par adresse et par heure, pour éviter le mailbombing. */
const signup = createLimiter(5, 60 * 60 * 1000);

export const customerLoginRate = login;
export const customerResetRate = reset;
export const customerSignupRate = signup;
