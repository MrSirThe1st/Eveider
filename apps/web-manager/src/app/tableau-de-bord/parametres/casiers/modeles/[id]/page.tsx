import { PageFrame } from '@eveider/ui';
import { notFound } from 'next/navigation';
import { AdminCasiersSettingsTabs, AdminParametresTabs } from '@/components/admin-module-tabs';
import { LockerTemplateEditor } from '@/components/locker-template-editor';
import { getLockerLayoutTemplate } from '@/server/locker-settings';
import { getAdminSession } from '@/server/session';

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminLockerTemplateEditPage({ params }: PageProps) {
  const { ctx } = await getAdminSession();
  const { id } = await params;
  const template = await getLockerLayoutTemplate(ctx, id);
  if (!template) notFound();

  return (
    <PageFrame
      title={template.name}
      description="Modifier ce modèle n’affecte pas les casiers déjà créés."
      layout="standard"
    >
      <AdminParametresTabs />
      <AdminCasiersSettingsTabs />
      <LockerTemplateEditor mode="edit" initial={template} />
    </PageFrame>
  );
}
