import { useState } from 'react';
import { Button } from '@/components/elements/button';
import { Label } from '@/components/elements/label';
import { Card } from '@/components/elements/card';
import { useImportLeadsFromExcel } from '@/services/lead';

interface LeadImportProps {
  // We keep the interface for backward compatibility
  agents?: Array<{ id: number; name: string }>;
}

export default function LeadImport(_props: LeadImportProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importStats, setImportStats] = useState<{ count: number } | null>(null);

  const {
    mutate: importLeads,
    isPending,
    error,
    isSuccess,
  } = useImportLeadsFromExcel();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    // Use a default agent ID of 1 since we no longer need to select an agent during import
    importLeads(
      { agentId: 1, formData },
      {
        onSuccess: (data) => {
          setImportStats({ count: data.data.count });
          setSelectedFile(null);
          // Reset the file input
          const fileInput = document.getElementById('excel-file') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        },
      }
    );
  };

  return (
    <Card className="p-4 my-2 mr-2">
      <h3 className="text-lg font-medium text-gray-700">Import des Leads</h3>
      <div className="mb-4 text-sm text-gray-600">
        <p>Format attendu du fichier Excel :</p>
        <ul className="list-disc pl-5 mt-2">
          <li>Colonne 1 : Numéro de téléphone</li>
          <li>Colonne 2 : Informations sur le bien</li>
        </ul>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label className="text-xs" htmlFor="excel-file">
            Fichier Excel
          </Label>
          <input
            id="excel-file"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
            required
          />
        </div>

        <Button
          disabled={isPending || !selectedFile}
          variant="secondary"
          type="submit"
          className="w-full"
        >
          {isPending ? 'Importation...' : 'Importer les Leads'}
        </Button>

        {error && (
          <div className="text-sm text-red-500">
            Erreur : {(error as Error).message}
          </div>
        )}

        {isSuccess && importStats && (
          <div className="text-sm text-green-500">
            {importStats.count} leads importés avec succès !
          </div>
        )}
      </form>
    </Card>
  );
}
