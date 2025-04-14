
import React, { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Logs, Clock, AlertTriangle, Info, CheckCircle } from 'lucide-react';

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: string;
}

interface LogPanelProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

const LogPanel: React.FC<LogPanelProps> = ({ logs, onClearLogs }) => {
  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getLogStyle = (type: LogEntry['type']) => {
    switch (type) {
      case 'info':
        return 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50';
      case 'warning':
        return 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50';
      case 'error':
        return 'border-destructive/50 bg-destructive/10';
      case 'success':
        return 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/50';
    }
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-2 border-b">
        <div className="flex items-center gap-2">
          <Logs className="h-4 w-4" />
          <h3 className="font-medium text-sm">IPC Event Logs</h3>
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
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-2">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p>No log entries yet</p>
            <p className="text-xs">IPC events will appear here</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {logs.map((log) => (
              <Alert key={log.id} className={`py-2 px-3 ${getLogStyle(log.type)}`}>
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">{getLogIcon(log.type)}</div>
                  <div className="flex-1">
                    <AlertTitle className="text-xs font-medium mb-1">
                      {log.message}
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
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default LogPanel;
