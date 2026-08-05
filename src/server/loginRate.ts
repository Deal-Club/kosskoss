// Frein simple contre les tentatives de mot de passe : cinq échecs par
// adresse, puis quinze minutes de blocage. Le compteur est volontairement en
// mémoire — suffisant pour un serveur unique, sans infrastructure en plus.
// Avec plusieurs instances, il faudra le déplacer dans Redis.
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

interface Attempt {
  count: number;
  firstFailureAt: number;
}

const attempts = new Map<string, Attempt>();

function keyFor(email: string): string {
  return email.trim().toLowerCase();
}

export function checkLoginRate(email: string): { allowed: boolean; retryAfterSeconds: number } {
  const entry = attempts.get(keyFor(email));
  if (!entry) return { allowed: true, retryAfterSeconds: 0 };

  const elapsed = Date.now() - entry.firstFailureAt;
  if (elapsed > WINDOW_MS) {
    attempts.delete(keyFor(email));
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count < MAX_ATTEMPTS) return { allowed: true, retryAfterSeconds: 0 };

  return { allowed: false, retryAfterSeconds: Math.ceil((WINDOW_MS - elapsed) / 1000) };
}

export function registerFailedLogin(email: string): void {
  const key = keyFor(email);
  const entry = attempts.get(key);

  if (!entry || Date.now() - entry.firstFailureAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstFailureAt: Date.now() });
    return;
  }

  entry.count += 1;
}

export function resetLoginRate(email: string): void {
  attempts.delete(keyFor(email));
}
