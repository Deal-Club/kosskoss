// Classes partagées par les formulaires de l'espace client.
// Regroupées ici pour que la connexion, l'inscription et les écrans du compte
// aient exactement la même apparence, sans dupliquer les chaînes Tailwind.

export const INPUT =
  "w-full rounded-sm border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";

export const LABEL = "mb-1 block text-sm font-semibold text-foreground";

export const HINT = "mt-1 text-xs text-muted-foreground";

export const PRIMARY_BUTTON =
  "inline-flex items-center justify-center rounded-sm bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60";

export const SECONDARY_BUTTON =
  "inline-flex items-center justify-center rounded-sm border border-border bg-white px-6 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60";

export const DANGER_BUTTON =
  "inline-flex items-center justify-center rounded-sm bg-destructive px-6 py-2.5 text-sm font-bold text-white transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive disabled:cursor-not-allowed disabled:opacity-60";

export const CARD = "rounded-sm border border-border bg-white p-5 sm:p-6";

export const ALERT_ERROR =
  "rounded-sm border border-destructive bg-destructive/5 px-4 py-3 text-sm font-semibold text-destructive";

export const ALERT_SUCCESS =
  "rounded-sm border border-[#16a34a] bg-[#16a34a]/5 px-4 py-3 text-sm font-semibold text-[#15803d]";

export const ALERT_INFO =
  "rounded-sm border border-border bg-muted px-4 py-3 text-sm text-muted-foreground";
