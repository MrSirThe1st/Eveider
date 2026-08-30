import { PlatformAdminInviteLanding } from '@/components/platform-admin-invite-landing';

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function PlatformAdminInvitePage({ params }: PageProps) {
  const { token } = await params;
  return <PlatformAdminInviteLanding token={token} />;
}
