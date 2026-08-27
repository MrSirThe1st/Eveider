import { TeamInviteLanding } from '@/components/team-invite-landing';

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function TeamInvitePage({ params }: PageProps) {
  const { token } = await params;
  return <TeamInviteLanding token={token} />;
}
