import type { DataAccessContext } from '@eveider/data-access';
import { createRepositories } from '@eveider/data-access';
import type { IssueStatus } from '@eveider/domain';
import { toIssueDto } from '@/lib/issue-presenter';

export type IssueStatusFilter = 'all' | IssueStatus;

export type IssueItem = ReturnType<typeof toIssueDto>;

export async function listIssues(
  ctx: DataAccessContext,
  options?: { status?: IssueStatus },
): Promise<IssueItem[]> {
  const { issues } = createRepositories();
  const items = await issues.listAll(
    ctx,
    options?.status ? { status: options.status } : undefined,
  );
  return items.map(toIssueDto);
}
