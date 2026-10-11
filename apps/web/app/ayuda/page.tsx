import { PageHeader } from '@/components/ui';
import { Glossary } from '@/components/glossary';

export default function AyudaPage() {
  return (
    <>
      <PageHeader
        title="Ayuda"
        intro="Qué significan los términos tributarios que aparecen en el panel. Busca por nombre o sigla."
      />
      <div className="max-w-3xl">
        <Glossary />
      </div>
    </>
  );
}
