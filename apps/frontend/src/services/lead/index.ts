import { useMutation } from '@tanstack/react-query';
import api from '../axios';
import { queryClient } from '../query-client';

interface ImportLeadsParams {
  agentId: number;
  formData: FormData;
}

interface ImportLeadsResponse {
  message: string;
  count: number;
  leads: any[];
}

export const useImportLeadsFromExcel = () => {
  return useMutation({
    mutationFn: ({ agentId, formData }: ImportLeadsParams) => 
      api.post<ImportLeadsResponse>(`lead/import-excel/${agentId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }),
    onSuccess: () => {
      // Invalidate any queries that might be affected by this import
      queryClient.invalidateQueries({ queryKey: ['lead'] });
      queryClient.invalidateQueries({ queryKey: ['agent'] });
    },
  });
};
