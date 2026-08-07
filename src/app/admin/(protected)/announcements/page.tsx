import { requireAdminSession } from "@/lib/dal";
import { getAnnouncementConfig, listAnnouncements } from "@/server/announcements";
import { AnnouncementManager } from "@/components/admin/AnnouncementManager";

export default async function AdminAnnouncementsPage() {
  await requireAdminSession();
  const [items, config] = await Promise.all([listAnnouncements(), getAnnouncementConfig()]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground">Bandeau d&apos;annonce</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Le bandeau en haut de chaque page de la boutique. Les messages actifs défilent à la
          suite ; l&apos;ordre, les couleurs et la vitesse se règlent ici. Sans message actif, le
          bandeau ne s&apos;affiche pas du tout.
        </p>
      </div>

      <AnnouncementManager items={items} config={config} />
    </div>
  );
}
