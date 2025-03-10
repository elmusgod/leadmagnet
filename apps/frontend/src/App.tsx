import { Button } from '@/components/elements/button';
import { Input } from '@/components/elements/input';
import { Label } from '@/components/elements/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/elements/select';
import LeadImport from './components/fragments/lead-import';
import LeadList from './components/fragments/lead-list';
import {
    createColumnHelper,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { Edit, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card } from './components/elements/card';
import { Textarea } from './components/elements/textarea';
import DataGrid from './components/fragments/data-grid';
import {
    useCreateFromModule,
    useFindAllFromModule,
    useUpdateByKeyFromModule,
    useUpdateFromModule,
} from './services/modules';
import { useMakeOutboundCall } from './services/call-log';
import Modal from './components/fragments/modal';

const AgentPromptTextarea = ({ defaultPrompt, value, onChange }: { 
    defaultPrompt: string,
    value: string,
    onChange: (value: string) => void 
}) => {
    useEffect(() => {
        onChange(defaultPrompt);
    }, [defaultPrompt, onChange]);

    return (
        <Textarea
            name="agent-prompt"
            id={`agent-prompt`}
            placeholder="Enter agent prompt settings..."
            rows={4}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    );
};

export default function RealtimeConsole() {
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [promptValue, setPromptValue] = useState('');
    const [activeTab, setActiveTab] = useState<'calls' | 'leads'>('calls');

    const {
        data: callLogsResponse,
        isLoading: callLogsIsLoading,
        error: callLogsError,
    } = useFindAllFromModule('call-log', {
        orderBy: { column: 'created_at', order: 'desc' },
    });
    const callLogs = callLogsResponse?.data.data || [];

    const { data: agentsResponse } = useFindAllFromModule('agent', {});
    const agents = agentsResponse?.data.data || [];

    const { data: systemConfigResponse, isLoading: systemConfigIsLoading } =
        useFindAllFromModule('system-config', {});
    const config =
        (systemConfigResponse?.data.data as {
            id: number;
            key: string;
            value: string;
            created_at: Date;
            updated_at: Date;
        }[]) || [];

    // create log useCreateFromModule
    const {
        mutate: createCallLog,
        error: createCallLogError,
        isPending: createCallLogIsPending,
    } = useCreateFromModule('call-log');

    const {
        mutate: makeOutboundCall,
        error: makeOutboundCallError,
        isPending: makeOutboundCallIsPending,
    } = useMakeOutboundCall('call-log');

    const handleSubmitCall = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const number = formData.get('number') as string;
        const agent = formData.get('agent-select') as string;
        createCallLog({ number, agent });
    };

    const {
        mutate: createAgent,
        error: createAgentError,
        isPending: createAgentIsPending,
        isSuccess: createAgentIsSuccess,
        reset: resetCreateAgent,
    } = useCreateFromModule('agent');
    const {
        mutate: updateAgent,
        error: updateAgentError,
        isPending: updateAgentIsPending,
        isSuccess: updateAgentIsSuccess,
        reset: resetUpdateAgent,
    } = useUpdateFromModule('agent');
    const {
        mutateAsync: updateConfigByKey,
        error: updateConfigByKeyError,
        isPending: updateConfigByKeyIsPending,
    } = useUpdateByKeyFromModule('system-config');

    const handleSubmitAgent = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const agent = formData.get('agent-select') as string;
        const name = formData.get('agent-name') as string;
        const prompt = formData.get('agent-prompt') as string;

        if (agent === 'create') {
            createAgent({ name, prompt });
        } else {
            updateAgent({ id: parseInt(agent), data: { prompt } });
        }
    };

    const columnHelper = createColumnHelper<(typeof callLogs)[0]>();

    const columns = [
        columnHelper.accessor('call', {
            header: 'Call',
            cell: (info) => (
                <Button
                    disabled={info.row.original.status === 'called'}
                    variant="ghost"
                    size="sm"
                    className={`${
                        info.row.original.status === 'called'
                            ? 'bg-gray-500 cursor-not-allowed'
                            : 'bg-green-500 hover:bg-green-600'
                    }`}
                    onClick={() => {
                        makeOutboundCall(info.row.original.id);
                    }}
                >
                    <Phone className="h-4 w-4 text-white" />
                </Button>
            ),
        }),
        ...Object.keys(callLogs[0] || {}).map((key) =>
            columnHelper.accessor(key as keyof (typeof callLogs)[0], {
                header: key.charAt(0).toUpperCase() + key.slice(1),
                cell: (info) => {
                    if (key === 'agent') {
                        return agents.find(
                            (agent) => `${agent.id}` === info.getValue()
                        )?.name;
                    }

                    return info.getValue();
                },
            })
        ),
    ];

    const table = useReactTable({
        data: callLogs,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    useEffect(() => {
        if (createCallLogError) {
            alert(createCallLogError?.message);
        }
        if (createAgentError) {
            alert(createAgentError?.message);
        }
        if (updateAgentError) {
            alert(updateAgentError?.message);
        }
        if (updateAgentIsSuccess) {
            alert('Agent updated successfully');
        }
        if (createAgentIsSuccess || updateAgentIsSuccess) {
            const form = document.querySelector('#agent-form');
            if (form instanceof HTMLFormElement) {
                form.reset();
                setPromptValue('');
                setSelectedAgentId(null);
            }
            resetCreateAgent();
            resetUpdateAgent();
            alert('Agent created successfully');
        }
        if (makeOutboundCallError) {
            alert(makeOutboundCallError?.message);
        }
        if (updateConfigByKeyError) {
            alert(updateConfigByKeyError?.message);
        }
    }, [
        createCallLogError,
        createAgentError,
        updateAgentError,
        createAgentIsSuccess,
        updateAgentIsSuccess,
        makeOutboundCallError,
        updateConfigByKeyError,
    ]);

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <Modal
                open={isConfigModalOpen}
                onClose={() => setIsConfigModalOpen(false)}
                title="Configuration"
                description="Update your OpenAI API key and other settings"
            >
                <form
                    className="mt-4 space-y-4"
                    onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const data = [
                            {
                                key: 'openai_api_key',
                                value:
                                    formData
                                        .get('openai_api_key')
                                        ?.toString() || '',
                            },
                            {
                                key: 'twilio_account_sid',
                                value:
                                    formData
                                        .get('twilio_account_sid')
                                        ?.toString() || '',
                            },
                            {
                                key: 'twilio_auth_token',
                                value:
                                    formData
                                        .get('twilio_auth_token')
                                        ?.toString() || '',
                            },
                            {
                                key: 'twilio_phone_number',
                                value:
                                    formData
                                        .get('twilio_phone_number')
                                        ?.toString() || '',
                            },
                            {
                                key: 'server_url',
                                value:
                                    formData.get('server_url')?.toString() ||
                                    '',
                            },
                        ];

                        for (let i = 0; i < data.length; i++) {
                            await updateConfigByKey({
                                key: data[i].key,
                                value: data[i].value,
                            });
                        }

                        // TODO: Call API to save config
                        setIsConfigModalOpen(false);
                    }}
                >
                    <div>
                        <Label htmlFor="openai_api_key">OpenAI API Key</Label>
                        <Input
                            id="openai_api_key"
                            name="openai_api_key"
                            type="text"
                            placeholder="sk-..."
                            defaultValue={
                                config.find((c) => c.key === 'openai_api_key')
                                    ?.value
                            }
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="twilio_account_sid">
                            Twilio Account SID
                        </Label>
                        <Input
                            id="twilio_account_sid"
                            name="twilio_account_sid"
                            type="text"
                            placeholder="AC..."
                            defaultValue={
                                config.find(
                                    (c) => c.key === 'twilio_account_sid'
                                )?.value
                            }
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="twilio_auth_token">
                            Twilio Auth Token
                        </Label>
                        <Input
                            id="twilio_auth_token"
                            name="twilio_auth_token"
                            type="text"
                            placeholder="Enter auth token..."
                            defaultValue={
                                config.find(
                                    (c) => c.key === 'twilio_auth_token'
                                )?.value
                            }
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="twilio_phone_number">
                            Twilio Phone Number
                        </Label>
                        <Input
                            id="twilio_phone_number"
                            name="twilio_phone_number"
                            type="text"
                            placeholder="+1234567890"
                            defaultValue={
                                config.find(
                                    (c) => c.key === 'twilio_phone_number'
                                )?.value
                            }
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="server_url">Server URL</Label>
                        <Input
                            id="server_url"
                            name="server_url"
                            type="text"
                            placeholder="https://example.com"
                            defaultValue={
                                config.find((c) => c.key === 'server_url')
                                    ?.value
                            }
                            className="mt-1"
                        />
                    </div>
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={updateConfigByKeyIsPending}
                    >
                        {updateConfigByKeyIsPending ? 'Saving...' : 'Save'}
                    </Button>
                </form>
            </Modal>

            {makeOutboundCallIsPending && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <div className="flex items-center space-x-3">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                            <p className="text-lg font-semibold text-gray-700">
                                Making outbound call...
                            </p>
                        </div>
                    </div>
                </div>
            )}
            <header className="bg-white shadow-sm p-2">
                <div className="mx-auto flex justify-between items-center">
                    <h1 className="text-base font-medium text-gray-700">
                        Realtime Call Center
                    </h1>
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">
                            Api Config
                            {config.length === 0 && !systemConfigIsLoading && (
                                <span className="text-xs text-red-500 ml-1">
                                    (Please set configuration)
                                </span>
                            )}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                setIsConfigModalOpen(true);
                            }}
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-grow">
                <div className="flex gap-2">
                    {/* Left: DataGrid or LeadList */}
                    <div className="flex-1 max-w-[100vw-320px] overflow-hidden">
                        <div className="flex border-b mb-4">
                            <button
                                className={`px-4 py-2 font-medium ${
                                    activeTab === 'calls'
                                        ? 'text-blue-600 border-b-2 border-blue-600'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                                onClick={() => setActiveTab('calls')}
                            >
                                Appels
                            </button>
                            <button
                                className={`px-4 py-2 font-medium ${
                                    activeTab === 'leads'
                                        ? 'text-blue-600 border-b-2 border-blue-600'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                                onClick={() => setActiveTab('leads')}
                            >
                                Leads
                            </button>
                        </div>

                        {activeTab === 'calls' ? (
                            callLogsIsLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-sm font-medium text-gray-600">
                                        Loading...
                                    </div>
                                </div>
                            ) : callLogsError ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-sm font-medium text-red-600">
                                        Error: {callLogsError.message}
                                    </div>
                                </div>
                            ) : (
                                <DataGrid
                                    table={table}
                                    freezeColumns={1}
                                    onCellEdit={() => {}}
                                />
                            )
                        ) : (
                            <LeadList 
                                agents={agents as Array<{ id: number; name: string }>}
                                onAddToPrompt={(_, summary) => {
                                    // Find the current prompt value
                                    const currentPrompt = promptValue || '';
                                    
                                    // Add the lead summary to the end of the prompt
                                    const updatedPrompt = currentPrompt + 
                                        (currentPrompt ? '\n\n' : '') + 
                                        `Informations sur le bien:\n${summary}`;
                                    
                                    // Update the prompt value
                                    setPromptValue(updatedPrompt);
                                    
                                    // If an agent is selected, scroll to the agent prompt section
                                    if (selectedAgentId) {
                                        const agentPromptSection = document.getElementById('agent-form');
                                        if (agentPromptSection) {
                                            agentPromptSection.scrollIntoView({ behavior: 'smooth' });
                                        }
                                    } else {
                                        // If no agent is selected, select the first one
                                        if (agents.length > 0) {
                                            setSelectedAgentId(`${agents[0].id}`);
                                        }
                                    }
                                }}
                            />
                        )}
                    </div>

                    <div className="w-80">
                        <Card className="p-4 my-2 mr-2">
                            <h3 className="text-lg font-medium text-gray-700">
                                Add Call
                            </h3>
                            <form
                                onSubmit={handleSubmitCall}
                                className="space-y-4"
                            >
                                <div className="">
                                    <Label className="text-xs" htmlFor="number">
                                        Phone Number
                                    </Label>
                                    <Input
                                        name="number"
                                        id="number"
                                        placeholder="+1(000)000-0000"
                                        required
                                    />
                                </div>
                                <div className="">
                                    <Label
                                        className="text-xs"
                                        htmlFor="agent-select"
                                    >
                                        Select Agent
                                    </Label>
                                    <Select required name="agent-select">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select an agent" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {agents.map((agent) => (
                                                <SelectItem
                                                    value={`${agent.id}`}
                                                >
                                                    {`${agent.id} - ${agent.name}`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    disabled={createCallLogIsPending}
                                    variant="secondary"
                                    type="submit"
                                    className="w-full"
                                >
                                    {createCallLogIsPending
                                        ? 'Submitting...'
                                        : 'Submit'}
                                </Button>
                            </form>
                        </Card>

                        <LeadImport agents={agents as Array<{ id: number; name: string }>} />
                        
                        <Card className="p-4 my-2 mr-2">
                            <h3 className="text-lg font-medium text-gray-700">
                                Agent Prompt
                            </h3>
                            <form
                                id="agent-form"
                                onSubmit={handleSubmitAgent}
                                className="space-y-4"
                            >
                                <div className="">
                                    <Label
                                        className="text-xs"
                                        htmlFor="agent-select"
                                    >
                                        Select Agent
                                    </Label>
                                    <Select
                                        required
                                        value={selectedAgentId || ''}
                                        onValueChange={(value) =>
                                            setSelectedAgentId(value)
                                        }
                                        name="agent-select"
                                    >
                                        <SelectTrigger
                                            id="agent-select"
                                            name="agent-select"
                                        >
                                            <SelectValue placeholder="Select an agent" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="create">
                                                Create New Agent
                                            </SelectItem>
                                            {agents.map((agent) => (
                                                <SelectItem
                                                    value={`${agent.id}`}
                                                >
                                                    {`${agent.id} - ${agent.name}`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {selectedAgentId === 'create' && (
                                    <>
                                        <div className="">
                                            <Label
                                                className="text-xs"
                                                htmlFor="agent-name"
                                            >
                                                Agent Name
                                            </Label>
                                            <Input
                                                id="agent-name"
                                                name="agent-name"
                                                placeholder="Enter agent name..."
                                            />
                                        </div>
                                    </>
                                )}
                                <div className="">
                                    <Label
                                        className="text-xs"
                                        htmlFor="agent-prompt"
                                    >
                                        Agent Prompt
                                    </Label>
                                    <AgentPromptTextarea
                                        defaultPrompt={
                                            agents.find(
                                                (agent) =>
                                                    `${agent.id}` ===
                                                    selectedAgentId
                                            )?.prompt || ''
                                        }
                                        value={promptValue}
                                        onChange={setPromptValue}
                                    />
                                </div>
                                <Button
                                    disabled={
                                        createAgentIsPending ||
                                        updateAgentIsPending
                                    }
                                    variant="secondary"
                                    type="submit"
                                    className="w-full"
                                >
                                    {createAgentIsPending ||
                                    updateAgentIsPending
                                        ? 'Submitting...'
                                        : 'Save'}
                                </Button>
                            </form>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
