import { useState } from 'react';
import { Card } from '@/components/elements/card';
import { useGetLeads, useUpdateLeadStatus, useDeleteLead } from '@/services/lead';
import { Button } from '@/components/elements/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/elements/select';
import Modal from '@/components/fragments/modal';

interface LeadListProps {
  agents?: Array<{ id: number; name: string }>;
  onAddToPrompt?: (leadId: number, summary: string) => void;
}

// Define available lead statuses
const LEAD_STATUSES = [
  { value: 'new', label: 'Non contacté' },
  { value: 'in_progress', label: 'En cours de discussion' },
  { value: 'rejected', label: 'Refusé' },
  { value: 'appointment', label: 'RDV fixé' },
  { value: 'completed', label: 'Terminé' }
];

export default function LeadList(props: LeadListProps) {
  const { agents = [] } = props;
  
  // State for the agent selection modal
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<number | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  
  // State for the status update modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [leadForStatusUpdate, setLeadForStatusUpdate] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  
  // Fetch all leads
  const { 
    data: leads, 
    isLoading, 
    error 
  } = useGetLeads();
  
  // Mutations for lead operations
  const { mutate: updateLeadStatus } = useUpdateLeadStatus();
  const { mutate: deleteLead, isPending: isDeleting } = useDeleteLead();
  
  // Function to handle lead deletion with confirmation
  const handleDeleteLead = (leadId: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce lead ?')) {
      deleteLead(leadId, {
        onSuccess: () => {
          // Force refetch leads after deletion
          window.location.reload();
        }
      });
    }
  };

  // Function to handle sending a lead to calls
  const handleSendToCall = (leadId: number) => {
    setSelectedLead(leadId);
    setIsAgentModalOpen(true);
  };

  // Function to confirm sending lead to calls
  const handleConfirmSendToCall = () => {
    if (selectedLead && selectedAgentId && props.onAddToPrompt) {
      const lead = leads?.find(l => l.id === selectedLead);
      if (lead) {
        props.onAddToPrompt(selectedLead, lead.property_info);
      }
    }
    setIsAgentModalOpen(false);
    setSelectedLead(null);
    setSelectedAgentId(null);
  };
  
  // Function to open status update modal
  const handleOpenStatusModal = (leadId: number, currentStatus: string) => {
    setLeadForStatusUpdate(leadId);
    setSelectedStatus(currentStatus);
    setIsStatusModalOpen(true);
  };
  
  // Function to confirm status update
  const handleConfirmStatusUpdate = () => {
    if (leadForStatusUpdate && selectedStatus) {
      updateLeadStatus({ 
        leadId: leadForStatusUpdate, 
        status: selectedStatus 
      });
    }
    setIsStatusModalOpen(false);
    setLeadForStatusUpdate(null);
    setSelectedStatus(null);
  };

  // Function to get status display name
  const getStatusDisplayName = (statusValue: string) => {
    const status = LEAD_STATUSES.find(s => s.value === statusValue);
    return status ? status.label : statusValue;
  };

  return (
    <>
      <Card className="p-4 my-2 overflow-hidden">
        <h3 className="text-lg font-medium text-gray-700 mb-4">Leads</h3>

        {isLoading ? (
          <div className="text-center py-4">Chargement des leads...</div>
        ) : error ? (
          <div className="text-center py-4 text-red-500">
            Erreur: {(error as Error).message}
          </div>
        ) : leads && leads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Téléphone
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Informations du bien
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.phone_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {lead.property_info}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button 
                        onClick={() => handleOpenStatusModal(lead.id, lead.status)}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {getStatusDisplayName(lead.status)}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2 justify-end">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleSendToCall(lead.id)}
                        >
                          Envoyer vers les appels
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteLead(lead.id)}
                          disabled={isDeleting}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            Aucun lead trouvé. Importez des leads pour commencer.
          </div>
        )}
      </Card>

      {/* Modal for selecting an agent */}
      <Modal
        open={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
        title="Sélectionner un agent"
        description="Choisissez l'agent qui prendra en charge cet appel"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Veuillez sélectionner l'agent qui prendra en charge cet appel.
          </p>
          
          <Select
            value={selectedAgentId || ''}
            onValueChange={(value) => setSelectedAgentId(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un agent" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={`${agent.id}`}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsAgentModalOpen(false)}>
              Annuler
            </Button>
            <Button 
              disabled={!selectedAgentId} 
              onClick={handleConfirmSendToCall}
            >
              Confirmer
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Modal for updating lead status */}
      <Modal
        open={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Mettre à jour le statut"
        description="Choisissez le nouveau statut pour ce lead"
      >
        <div className="space-y-4">
          <Select
            value={selectedStatus || ''}
            onValueChange={(value) => setSelectedStatus(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un statut" />
            </SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsStatusModalOpen(false)}>
              Annuler
            </Button>
            <Button 
              disabled={!selectedStatus} 
              onClick={handleConfirmStatusUpdate}
            >
              Confirmer
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
