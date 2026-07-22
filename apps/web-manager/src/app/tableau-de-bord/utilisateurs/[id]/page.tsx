import { CourierProfileDetail } from '@/components/courier-profile-detail';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CourierDetailPage({ params }: PageProps) {
  const { id } = await params;

  return <CourierProfileDetail courierId={id} />;
}
