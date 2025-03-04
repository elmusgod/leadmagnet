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
  agent_id: number;
  source: string | null;
  type: string | null;
  sub_type: string | null;
  surface: string | null;
  surface_carrez: string | null;
  room_count: string | null;
  floor_count: string | null;
  construction_year: string | null;
  new_build: boolean | null;
  marketing_type: string | null;
  price: string | null;
  price_hc: string | null;
  price_cc: string | null;
  selling_price: string | null;
  dealers: string | null;
  marketing_start_date: string | null;
  marketing_end_date: string | null;
  publication_start_date: string | null;
  publication_end_date: string | null;
  rental_expenses: string | null;
  rental_expenses_included: boolean | null;
  fees: string | null;
  fees_included: boolean | null;
  iris_ids: string | null;
  street_number: string | null;
  street: string | null;
  zip_code: string | null;
  city: string | null;
  lat: string | null;
  lon: string | null;
  description: string | null;
  images: string | null;
  ads: string | null;
  phone_number: string | null;
  floor_level: string | null;
  land: boolean | null;
  surface_land: string | null;
  terrace: boolean | null;
  balcony: boolean | null;
  cellar: boolean | null;
  parking: boolean | null;
  swimming_pool: boolean | null;
  general_state: string | null;
  dpe_letter: string | null;
  dpe: string | null;
  ges_letter: string | null;
  ges: string | null;
  diagnosis_date: string | null;
  statut: string;
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
