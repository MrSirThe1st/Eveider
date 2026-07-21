import type { DataAccessContext } from '@eveider/data-access';
import { createRepositories } from '@eveider/data-access';
import { toBusinessDto, type BusinessDto } from '@/lib/business-presenter';

export type BusinessListItem = Pick<
  BusinessDto,
  'id' | 'name' | 'status' | 'contactEmail' | 'contactPhone' | 'createdAt'
>;

export async function listBusinesses(ctx: DataAccessContext): Promise<BusinessListItem[]> {
  const { businesses } = createRepositories();
  const items = await businesses.list(ctx);
  return items.map((item) => {
    const dto = toBusinessDto(item);
    return {
      id: dto.id,
      name: dto.name,
      status: dto.status,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      createdAt: dto.createdAt,
    };
  });
}
