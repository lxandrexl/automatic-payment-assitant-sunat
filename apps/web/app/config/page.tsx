import { apiGet } from '@/lib/api';
import type { Settings } from '@/lib/types';
import { ConfigForm } from '@/components/config-form';
import { Glossary } from '@/components/glossary';

export const dynamic = 'force-dynamic';

export default async function ConfigPage() {
  const settings = await apiGet<Settings>('/settings');
  return (
    <div className="space-y-4">
      <ConfigForm settings={settings} />
      <Glossary />
    </div>
  );
}
