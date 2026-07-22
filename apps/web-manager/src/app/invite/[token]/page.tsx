import { InviteLanding } from '@/components/invite-landing';

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;
  return <InviteLanding token={token} />;
}
