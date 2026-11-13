import React, { useState } from 'react';
import { History, Shield, Trash2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

interface ActivityItem {
  id: string;
  timestamp: string;
  action: string;
  entity: string;
  status: 'success' | 'warn' | 'error';
  details: string;
}

export const ActivityView: React.FC = () => {
  const [logs, setLogs] = useState<ActivityItem[]>([
    {
      id: '1',
      timestamp: new Date().toLocaleTimeString(),
      action: 'Profile Started',
      entity: 'Profile 1024',
      status: 'success',
      details: 'Spawned Chromium process with PID 18492 on port 9222. Isolation directory locked.',
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 1000 * 60 * 3).toLocaleTimeString(),
      action: 'Proxy Checked',
      entity: 'US Residential 01',
      status: 'success',
      details: 'Exit IP verified: 198.51.100.42 (US). Latency: 48ms.',
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 1000 * 60 * 12).toLocaleTimeString(),
      action: 'Profile Created',
      entity: 'Profile 1024',
      status: 'success',
      details: 'Created profile with Windows 11 Chrome fingerprint. WebRTC strict policy applied.',
    },
  ]);

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 max-w-4xl mx-auto space-y-4 bg-background">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <History className="w-4 h-4 text-foreground" />
            Local Activity & Audit Trail
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time local event history. No external telemetry or cloud reporting.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setLogs([])}
          className="gap-1.5 h-8 text-xs"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear Logs
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5">
        {logs.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-xs">
            No activity logs recorded yet.
          </div>
        ) : (
          logs.map((item) => (
            <Card
              key={item.id}
              className="p-3.5 flex items-start justify-between gap-4 border-border bg-card"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {item.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : item.status === 'warn' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{item.action}</span>
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {item.entity}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{item.details}</p>
                </div>
              </div>

              <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                {item.timestamp}
              </span>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
