import { DriverInviteLanding } from '@/components/driver-invite-landing';

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function DriverInvitePage({ params }: PageProps) {
  const { token } = await params;
  return <DriverInviteLanding token={decodeURIComponent(token)} />;
}
