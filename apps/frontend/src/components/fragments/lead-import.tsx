import { useState } from 'react';
import { Button } from '@/components/elements/button';
import { Label } from '@/components/elements/label';
import { Card } from '@/components/elements/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/elements/select';
import { useImportLeadsFromExcel } from '@/services/lead';

interface LeadImportProps {
  agents: Array<{ id: number; name: string }>;
}

export default function LeadImport({ agents }: LeadImportProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
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
    if (!selectedFile || !selectedAgentId) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    importLeads(
      { agentId: parseInt(selectedAgentId), formData },
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
      <h3 className="text-lg font-medium text-gray-700">Import Leads</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label className="text-xs" htmlFor="agent-select">
            Select Agent
          </Label>
          <Select
            required
            value={selectedAgentId || ''}
            onValueChange={(value) => setSelectedAgentId(value)}
            name="agent-select"
          >
            <SelectTrigger id="agent-select">
              <SelectValue placeholder="Select an agent" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={`${agent.id}`}>
                  {`${agent.id} - ${agent.name}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs" htmlFor="excel-file">
            Excel File
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
          disabled={isPending || !selectedFile || !selectedAgentId}
          variant="secondary"
          type="submit"
          className="w-full"
        >
          {isPending ? 'Importing...' : 'Import Leads'}
        </Button>

        {error && (
          <div className="text-sm text-red-500">
            Error: {(error as Error).message}
          </div>
        )}

        {isSuccess && importStats && (
          <div className="text-sm text-green-500">
            Successfully imported {importStats.count} leads!
          </div>
        )}
      </form>
    </Card>
  );
}
