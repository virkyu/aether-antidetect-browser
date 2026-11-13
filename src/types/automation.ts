export type NodeType = 
  | 'start_browser'
  | 'navigate'
  | 'click'
  | 'type_text'
  | 'wait_delay'
  | 'wait_element'
  | 'scroll'
  | 'screenshot'
  | 'extract_text'
  | 'eval_script'
  | 'condition'
  | 'loop';

export interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  params: Record<string, any>;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionLog {
  timestamp: string;
  nodeId?: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface ScenarioRunResult {
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'paused' | 'stopped';
  currentStepIndex: number;
  totalSteps: number;
  logs: ExecutionLog[];
}
