import { NextResponse } from 'next/server';
import { buildAnalyticsExportWorkbook } from '@/lib/export/analytics-export';
import { stampFilename, xlsxResponse } from '@/lib/export/xlsx-utils';
import { requireAdminSession } from '@/lib/session';
import { loadAdminAnalytics } from '@/server/dashboard';

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const daysParam = searchParams.get('days');
  const days = daysParam ? Number.parseInt(daysParam, 10) : 7;
  const safeDays = Number.isFinite(days) && days >= 1 && days <= 30 ? days : 7;

  try {
    const analytics = await loadAdminAnalytics(auth.session.ctx, safeDays);
    const workbook = await buildAnalyticsExportWorkbook(analytics, safeDays);
    return xlsxResponse(workbook, stampFilename('analytics'));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
