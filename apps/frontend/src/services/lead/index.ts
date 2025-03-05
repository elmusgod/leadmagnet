import { useMutation, useQuery } from '@tanstack/react-query';
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

export interface Lead {
  id: number;
  phone_number: string;
  property_info: string;
  status: string;
  created_at: string;
  updated_at: string;
  summary?: string;
}

// Hook to fetch all leads
export const useGetLeads = (agentId?: number) => {
  return useQuery({
    queryKey: ['leads', agentId],
    queryFn: async () => {
      const params = agentId ? { agent_id: agentId } : {};
      const response = await api.get<Lead[]>('lead', { params });
      return response.data;
    },
  });
};

// Hook to fetch a single lead by ID
export const useGetLead = (id: number) => {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      const response = await api.get<Lead>(`lead/${id}`);
      return response.data;
    },
    enabled: !!id, // Only run the query if id is provided
  });
};

// Hook to generate a summary for a lead
export const useGenerateLeadSummary = () => {
  return useMutation({
    mutationFn: async (leadId: number) => {
      const response = await api.get<{ summary: string }>(`lead/${leadId}/summary`);
      return response.data.summary;
    },
    onSuccess: (summary, leadId) => {
      // Update the lead cache with the new summary
      queryClient.setQueryData(['lead', leadId], (oldData: Lead | undefined) => {
        if (!oldData) return oldData;
        return { ...oldData, summary };
      });
      
      // Also update the lead in the leads list cache
      queryClient.setQueriesData({ queryKey: ['leads'] }, (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((lead: Lead) => 
          lead.id === leadId ? { ...lead, summary } : lead
        );
      });
    },
  });
};

// Hook to update lead status
export const useUpdateLeadStatus = () => {
  return useMutation({
    mutationFn: async ({ leadId, status }: { leadId: number; status: string }) => {
      const response = await api.put<Lead>(`lead/${leadId}/status`, { status });
      return response.data;
    },
    onSuccess: (updatedLead) => {
      // Update the lead cache with the new status
      queryClient.setQueryData(['lead', updatedLead.id], updatedLead);
      
      // Also update the lead in the leads list cache
      queryClient.setQueriesData({ queryKey: ['leads'] }, (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((lead: Lead) => 
          lead.id === updatedLead.id ? updatedLead : lead
        );
      });
    },
  });
};

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

// Hook to delete a lead
export const useDeleteLead = () => {
  return useMutation({
    mutationFn: (leadId: number) => api.delete(`lead/${leadId}`),
    onSuccess: () => {
      // Invalidate lead queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['lead'] });
    },
  });
};
