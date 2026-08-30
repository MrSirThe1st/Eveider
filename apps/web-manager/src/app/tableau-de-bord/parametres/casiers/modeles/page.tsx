import { Button } from '@eveider/ui';
import Link from 'next/link';
import { LockerTemplateList } from '@/components/locker-template-list';
import { listLockerLayoutTemplates } from '@/server/locker-settings';
import { getAdminSession } from '@/server/session';

export default async function AdminLockerTemplatesPage() {
  const { ctx } = await getAdminSession();
  const templates = await listLockerLayoutTemplates(ctx);

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '1rem',
        }}
      >
        <Link href="/tableau-de-bord/parametres/casiers/modeles/nouveau">
          <Button type="button" style={{ fontWeight: 700 }}>
            Nouveau modèle
          </Button>
        </Link>
      </div>
      <LockerTemplateList templates={templates} />
    </>
  );
}
