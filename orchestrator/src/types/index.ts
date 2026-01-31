export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolCallRequest {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolCallResponse {
  content: { type: string; text: string }[];
  isError: boolean;
}

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface A2AAgentCard {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  endpoint: string;
  status: 'online' | 'offline' | 'busy';
  tools: string[];
}

export interface A2ATask {
  id: string;
  agentId: string;
  type: string;
  input: Record<string, any>;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface A2AMessage {
  id: string;
  fromAgent: string;
  toAgent: string;
  type: 'request' | 'response' | 'notification';
  payload: any;
  timestamp: Date;
}

export interface AgentConfig {
  id: string;
  name: string;
  type: 'legal_analyst' | 'research_agent' | 'loophole_detector' | 'risk_assessor' | 'contract_reviewer' | 'compliance_checker' | 'supervisor';
  model: string;
  systemPrompt: string;
  tools: string[];
  maxIterations: number;
}

export interface OrchestrationResult {
  taskId: string;
  agents: string[];
  results: Record<string, any>;
  aggregatedAnalysis: string;
  processingTime: number;
  toolsUsed: string[];
}

export interface WebSocketMessage {
  type: 'agent_update' | 'task_progress' | 'analysis_complete' | 'error';
  taskId?: string;
  agentId?: string;
  data: any;
  timestamp: Date;
}
