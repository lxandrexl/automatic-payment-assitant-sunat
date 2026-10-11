import { apiGet } from '@/lib/api';
import type { Settings } from '@/lib/types';
import { ConfigForm } from '@/components/config-form';
import { MoreLink, PageHeader } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function ConfigPage() {
  const settings = await apiGet<Settings>('/settings');
  return (
    <>
      <PageHeader
        title="Ajustes"
        intro="Tus datos tributarios, tus clientes y cómo quieres recibir los avisos."
        actions={<MoreLink href="/ayuda">Diccionario de términos</MoreLink>}
      />
      <ConfigForm settings={settings} />
    </>
  );
}
