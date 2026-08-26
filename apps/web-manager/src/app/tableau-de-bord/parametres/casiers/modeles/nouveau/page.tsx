import { PageFrame } from '@eveider/ui';
import { AdminCasiersSettingsTabs, AdminParametresTabs } from '@/components/admin-module-tabs';
import { LockerTemplateEditor } from '@/components/locker-template-editor';
import { getAdminSession } from '@/server/session';

export default async function AdminLockerTemplateCreatePage() {
  await getAdminSession();

  return (
    <PageFrame
      title="Nouveau modèle"
      description="Définissez la grille et les tailles S/M/L. Les casiers créés ensuite en héritent une copie."
      layout="standard"
    >
      <AdminParametresTabs />
      <AdminCasiersSettingsTabs />
      <LockerTemplateEditor mode="create" />
    </PageFrame>
  );
}
