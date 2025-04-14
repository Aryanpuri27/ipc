
import React, { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Logs, Clock, AlertTriangle, Info, CheckCircle, ShieldAlert, BadgeAlert, Octagon } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: string;
  additionalInfo?: {
    processes?: string[];
    resources?: string[];
    solutions?: string[];
    severity?: 'low' | 'medium' | 'high';
  };
}

interface LogPanelProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

const LogPanel: React.FC<LogPanelProps> = ({ logs, onClearLogs }) => {
  const getLogIcon = (type: LogEntry['type'], severity?: 'low' | 'medium' | 'high') => {
    switch (type) {
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'warning':
        return severity === 'high' 
          ? <BadgeAlert className="h-4 w-4 text-amber-500" />
          : <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'error':
        return severity === 'high' 
          ? <Octagon className="h-4 w-4 text-destructive" />
          : <ShieldAlert className="h-4 w-4 text-destructive" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getLogStyle = (type: LogEntry['type'], severity?: 'low' | 'medium' | 'high') => {
    const baseStyle = {
      info: 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50',
      warning: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50',
      error: 'border-destructive/50 bg-destructive/10',
      success: 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/50'
    };
    
    // Add pulse animation for high severity items
    if (severity === 'high') {
      return `${baseStyle[type]} animate-pulse`;
    }
    
    return baseStyle[type];
  };

  // Auto-scroll to the bottom of log panel when new logs appear
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [logs]);

  // Filter system for logs
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info' | 'success'>('all');
  
  const filteredLogs = React.useMemo(() => {
    if (filter === 'all') return logs;
    return logs.filter(log => log.type === filter);
  }, [logs, filter]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-2 border-b">
        <div className="flex items-center gap-2">
          <Logs className="h-4 w-4" />
          <h3 className="font-medium text-sm">IPC Event Logs</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-md overflow-hidden text-xs">
            <button 
              className={`px-2 py-1 ${filter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button 
              className={`px-2 py-1 ${filter === 'error' ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
              onClick={() => setFilter('error')}
            >
              Errors
            </button>
            <button 
              className={`px-2 py-1 ${filter === 'warning' ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
              onClick={() => setFilter('warning')}
            >
              Warnings
            </button>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearLogs}
            disabled={logs.length === 0}
          >
            Clear
          </Button>
        </div>
      </div>
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-2">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p>No log entries yet</p>
            <p className="text-xs">IPC events will appear here</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredLogs.map((log) => (
              <Collapsible key={log.id} className="w-full">
                <Alert className={`py-2 px-3 ${getLogStyle(log.type, log?.additionalInfo?.severity)}`}>
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">{getLogIcon(log.type, log?.additionalInfo?.severity)}</div>
                    <div className="flex-1">
                      <AlertTitle className="text-xs font-medium mb-1 flex items-center justify-between">
                        <span>{log.message}</span>
                        {log.additionalInfo && (
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                              <Info className="h-3 w-3" />
                            </Button>
                          </CollapsibleTrigger>
                        )}
                      </AlertTitle>
                      {log.details && (
                        <AlertDescription className="text-xs">
                          {log.details}
                        </AlertDescription>
                      )}
                      <div className="flex items-center mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        {log.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </Alert>
                
                {log.additionalInfo && (
                  <CollapsibleContent className="bg-muted/50 rounded-b-md p-3 -mt-1 text-xs border-x border-b">
                    <div className="space-y-2">
                      {log.additionalInfo.severity && (
                        <div>
                          <span className="font-semibold">Severity:</span> 
                          <span className={`ml-2 px-2 py-0.5 rounded ${
                            log.additionalInfo.severity === 'high' ? 'bg-destructive/20 text-destructive' :
                            log.additionalInfo.severity === 'medium' ? 'bg-amber-200 text-amber-700' :
                            'bg-blue-200 text-blue-700'
                          }`}>
                            {log.additionalInfo.severity.toUpperCase()}
                          </span>
                        </div>
                      )}
                      
                      {log.additionalInfo.processes && log.additionalInfo.processes.length > 0 && (
                        <div>
                          <span className="font-semibold">Affected Processes:</span>
                          <ul className="list-disc ml-5 mt-1">
                            {log.additionalInfo.processes.map((process, idx) => (
                              <li key={idx}>{process}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {log.additionalInfo.resources && log.additionalInfo.resources.length > 0 && (
                        <div>
                          <span className="font-semibold">Resources Involved:</span>
                          <ul className="list-disc ml-5 mt-1">
                            {log.additionalInfo.resources.map((resource, idx) => (
                              <li key={idx}>{resource}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {log.additionalInfo.solutions && log.additionalInfo.solutions.length > 0 && (
                        <div>
                          <span className="font-semibold">Possible Solutions:</span>
                          <ul className="list-disc ml-5 mt-1">
                            {log.additionalInfo.solutions.map((solution, idx) => (
                              <li key={idx}>{solution}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                )}
              </Collapsible>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default LogPanel;
