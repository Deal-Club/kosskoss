import { createNavigation } from "next-intl/navigation";
import { routing } from "@/i18n/routing";

// Ces enveloppes ajoutent automatiquement le préfixe de langue aux liens,
// ce qui permet de changer de langue sans quitter la page courante.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
