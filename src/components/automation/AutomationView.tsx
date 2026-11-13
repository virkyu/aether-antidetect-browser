import React, { useState } from 'react';
import {
  Zap,
  Play,
  Pause,
  Square,
  Plus,
  Trash2,
  Globe,
  MousePointer,
  Type,
  Clock,
  Camera,
  Code,
  ArrowRight,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { useProfileStore } from '../../stores/profileStore';
import type { WorkflowNode, NodeType, ExecutionLog } from '../../types/automation';

export const AutomationView: React.FC = () => {
  const { profiles } = useProfileStore();

  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);

  // Default scenario steps
  const [nodes, setNodes] = useState<WorkflowNode[]>([
    {
      id: 'node-1',
      type: 'navigate',
      label: 'Open Target Page',
      params: { url: 'https://browserleaks.com/canvas' },
      position: { x: 0, y: 0 },
    },
    {
      id: 'node-2',
      type: 'wait_delay',
      label: 'Wait for Network Idle',
      params: { delaySec: 3 },
      position: { x: 0, y: 0 },
    },
    {
      id: 'node-3',
      type: 'screenshot',
      label: 'Capture Screenshot',
      params: { filename: 'canvas_fingerprint.png' },
      position: { x: 0, y: 0 },
    },
  ]);

  const addNode = (type: NodeType) => {
    const labels: Record<NodeType, string> = {
      start_browser: 'Start Browser Process',
      navigate: 'Navigate to URL',
      click: 'Click CSS Selector',
      type_text: 'Type Input Text',
      wait_delay: 'Wait Fixed Delay',
      wait_element: 'Wait for Selector',
      scroll: 'Scroll Page',
      screenshot: 'Take Screenshot',
      extract_text: 'Extract Text Data',
      eval_script: 'Execute JavaScript',
      condition: 'Check Condition',
      loop: 'Loop Block',
    };

    const defaultParams: Record<NodeType, any> = {
      start_browser: {},
      navigate: { url: 'https://example.com' },
      click: { selector: 'button.submit' },
      type_text: { selector: 'input[name="q"]', text: 'Aether browser' },
      wait_delay: { delaySec: 2 },
      wait_element: { selector: '.loaded', timeoutSec: 10 },
      scroll: { deltaY: 500 },
      screenshot: { filename: 'screenshot.png' },
      extract_text: { selector: 'h1' },
      eval_script: { script: 'console.log(document.title)' },
      condition: { expr: 'true' },
      loop: { count: 3 },
    };

    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type,
      label: labels[type],
      params: defaultParams[type],
      position: { x: 0, y: 0 },
    };

    setNodes([...nodes, newNode]);
  };

  const removeNode = (id: string) => {
    setNodes(nodes.filter((n) => n.id !== id));
  };

  const updateNodeParam = (id: string, key: string, value: any) => {
    setNodes(
      nodes.map((n) =>
        n.id === id ? { ...n, params: { ...n.params, [key]: value } } : n
      )
    );
  };

  const runWorkflow = async () => {
    if (!selectedProfileId && profiles.length > 0) {
      setSelectedProfileId(profiles[0].id);
    }
    setIsRunning(true);
    setLogs([]);

    const addLog = (level: 'info' | 'warn' | 'error', message: string, nodeId?: string) => {
      setLogs((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), level, message, nodeId },
      ]);
    };

    addLog('info', `Starting workflow execution with profile...`);

    for (let i = 0; i < nodes.length; i++) {
      setCurrentStep(i);
      const node = nodes[i];
      addLog('info', `Executing Step ${i + 1}: [${node.label}]`, node.id);

      // Simulate step execution delay
      await new Promise((r) => setTimeout(r, 1200));

      if (node.type === 'navigate') {
        addLog('info', `Navigated to ${node.params.url}`);
      } else if (node.type === 'screenshot') {
        addLog('info', `Saved screenshot to ~/.aether/screenshots/${node.params.filename}`);
      } else if (node.type === 'wait_delay') {
        addLog('info', `Finished delay of ${node.params.delaySec} seconds`);
      }
    }

    addLog('info', 'Workflow completed successfully!');
    setIsRunning(false);
    setCurrentStep(-1);
  };

  const profileOptions = profiles.length === 0
    ? [{ value: '', label: 'No profiles available' }]
    : profiles.map((p) => ({
        value: p.id,
        label: p.name,
        badge: p.status === 'running' ? 'Running' : undefined,
      }));

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Node Sequence List */}
      <div className="flex-1 flex flex-col border-r border-border overflow-hidden bg-background">
        {/* Scenario Header */}
        <div className="px-6 py-3 border-b border-border bg-card flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground font-medium">Target Profile:</label>
            <div className="w-56">
              <Select
                value={selectedProfileId}
                onChange={(val) => setSelectedProfileId(String(val))}
                options={profileOptions}
                placeholder="Select Profile..."
                triggerClassName="h-8 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              loading={isRunning}
              onClick={runWorkflow}
              className="gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Run Scenario
            </Button>
          </div>
        </div>

        {/* Steps Editor */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {nodes.map((node, index) => {
            const isCurrent = currentStep === index;

            return (
              <Card
                key={node.id}
                className={`transition-all ${
                  isCurrent
                    ? 'border-primary ring-1 ring-primary shadow-xs'
                    : 'border-border bg-card'
                }`}
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center justify-center w-6 h-6 rounded-md bg-muted border border-border text-[11px] font-mono text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="text-xs font-semibold text-foreground">{node.label}</span>
                      <Badge variant="outline" className="uppercase font-mono text-[10px]">
                        {node.type}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeNode(node.id)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Node parameters */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {node.type === 'navigate' && (
                      <div className="col-span-2">
                        <label className="block text-[11px] text-muted-foreground mb-1">Target URL</label>
                        <Input
                          value={node.params.url || ''}
                          onChange={(e) => updateNodeParam(node.id, 'url', e.target.value)}
                          placeholder="https://..."
                          className="h-8 text-xs"
                        />
                      </div>
                    )}

                    {node.type === 'click' && (
                      <div className="col-span-2">
                        <label className="block text-[11px] text-muted-foreground mb-1">CSS Selector</label>
                        <Input
                          value={node.params.selector || ''}
                          onChange={(e) => updateNodeParam(node.id, 'selector', e.target.value)}
                          placeholder="button.primary or #submit-btn"
                          className="h-8 text-xs"
                        />
                      </div>
                    )}

                    {node.type === 'type_text' && (
                      <>
                        <div>
                          <label className="block text-[11px] text-muted-foreground mb-1">CSS Selector</label>
                          <Input
                            value={node.params.selector || ''}
                            onChange={(e) => updateNodeParam(node.id, 'selector', e.target.value)}
                            placeholder="input[name='search']"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-muted-foreground mb-1">Text to Type</label>
                          <Input
                            value={node.params.text || ''}
                            onChange={(e) => updateNodeParam(node.id, 'text', e.target.value)}
                            placeholder="Text..."
                            className="h-8 text-xs"
                          />
                        </div>
                      </>
                    )}

                    {node.type === 'wait_delay' && (
                      <div>
                        <label className="block text-[11px] text-muted-foreground mb-1">Delay (Seconds)</label>
                        <Input
                          type="number"
                          value={node.params.delaySec || 1}
                          onChange={(e) => updateNodeParam(node.id, 'delaySec', Number(e.target.value))}
                          className="h-8 text-xs"
                        />
                      </div>
                    )}

                    {node.type === 'screenshot' && (
                      <div>
                        <label className="block text-[11px] text-muted-foreground mb-1">Filename</label>
                        <Input
                          value={node.params.filename || 'screenshot.png'}
                          onChange={(e) => updateNodeParam(node.id, 'filename', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Add Step Action Palette */}
          <div className="pt-2">
            <span className="block text-xs font-medium text-muted-foreground mb-2">Add Step:</span>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => addNode('navigate')}
                className="text-[11px] h-7 gap-1.5"
              >
                <Globe className="w-3 h-3 text-muted-foreground" />
                Navigate URL
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addNode('click')}
                className="text-[11px] h-7 gap-1.5"
              >
                <MousePointer className="w-3 h-3 text-muted-foreground" />
                Click Element
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addNode('type_text')}
                className="text-[11px] h-7 gap-1.5"
              >
                <Type className="w-3 h-3 text-muted-foreground" />
                Type Text
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addNode('wait_delay')}
                className="text-[11px] h-7 gap-1.5"
              >
                <Clock className="w-3 h-3 text-muted-foreground" />
                Wait Delay
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addNode('screenshot')}
                className="text-[11px] h-7 gap-1.5"
              >
                <Camera className="w-3 h-3 text-muted-foreground" />
                Screenshot
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Automation Execution Console */}
      <div className="w-80 flex flex-col bg-card border-l border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border text-xs font-semibold text-foreground flex items-center justify-between">
          <span>Execution Log</span>
          {isRunning && (
            <span className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-normal">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Running
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[11px]">
          {logs.length === 0 ? (
            <div className="text-muted-foreground text-center py-8">
              Click &quot;Run Scenario&quot; to execute the workflow via Chrome DevTools Protocol.
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex flex-col text-foreground">
                <span className="text-[10px] text-muted-foreground">{log.timestamp}</span>
                <span
                  className={
                    log.level === 'error'
                      ? 'text-destructive'
                      : log.level === 'warn'
                      ? 'text-amber-400'
                      : 'text-foreground'
                  }
                >
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
