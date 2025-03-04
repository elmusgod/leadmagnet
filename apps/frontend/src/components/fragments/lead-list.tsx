import { Card } from '@/components/elements/card';
import { useGetLeads } from '@/services/lead';

// Définition de l'interface sans les props inutilisées
interface LeadListProps {
  // Props conservées pour compatibilité avec l'appel du composant
  agents?: Array<{ id: number; name: string }>;
  onAddToPrompt?: (leadId: number, summary: string) => void;
}

export default function LeadList(_props: LeadListProps) {
  // Fetch all leads
  const { 
    data: leads, 
    isLoading, 
    error 
  } = useGetLeads();

  return (
    <Card className="p-4 my-2 overflow-hidden">
      <h3 className="text-lg font-medium text-gray-700 mb-4">Leads</h3>

      {isLoading ? (
        <div className="text-center py-4">Chargement des leads...</div>
      ) : error ? (
        <div className="text-center py-4 text-red-500">
          Erreur: {(error as Error).message}
        </div>
      ) : leads && leads.length > 0 ? (
        <div className="space-y-4">
          {leads.map((lead) => (
            <Card key={lead.id} className="p-3 border border-gray-200">
              <h4 className="font-medium">
                {lead.type || 'Propriété'} {lead.city && `à ${lead.city}`}
              </h4>
              <div className="text-sm text-gray-500 mt-1">
                {lead.surface && `${lead.surface}m² • `}
                {lead.price && `${lead.price}€ • `}
                {lead.phone_number && `${lead.phone_number}`}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          Aucun lead trouvé. Importez des leads pour commencer.
        </div>
      )}
    </Card>
  );
}
