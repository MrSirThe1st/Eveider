import { LockerTemplateEditor } from '@/components/locker-template-editor';
import { getAdminSession } from '@/server/session';

export default async function AdminLockerTemplateCreatePage() {
  await getAdminSession();
  return <LockerTemplateEditor mode="create" />;
}
