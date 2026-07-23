import { apiGet } from '@/lib/api';
import type { Settings } from '@/lib/types';
import { ConfigForm } from '@/components/config-form';

export const dynamic = 'force-dynamic';

export default async function ConfigPage() {
  const settings = await apiGet<Settings>('/settings');
  return <ConfigForm settings={settings} />;
}
