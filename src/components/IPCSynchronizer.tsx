
import React, { useState } from 'react';
import ProcessCanvas from './ProcessCanvas';
import IPCControlSidebar from './IPCControlSidebar';
import LogPanel, { LogEntry } from './LogPanel';
import { Button } from '@/components/ui/button';
import { SidebarIcon, Info, Logs, ShieldAlert } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const IPCSynchronizer: React.FC = () => {
  const [showSidebar, setShowSidebar] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [issuesDetected, setIssuesDetected] = useState(false);

  // Reference to ProcessCanvas for reset functionality
  const processCanvasRef = React.useRef<HTMLDivElement>(null);
  
  const handleReset = () => {
    // Force re-render of ProcessCanvas by changing its key
    const canvas = document.querySelector('.canvas-area');
    if (canvas) {
      // This is a simple approach - in a real app we would lift state up
      // and control the reset more elegantly
      window.location.reload();
    }
  };
  
  const handleLogEvent = (log: LogEntry) => {
    setLogs(prevLogs => [...prevLogs, log]);
    
    // Show log panel automatically when errors or high severity warnings are detected
    if (log.type === 'error' || 
        (log.type === 'warning' && log?.additionalInfo?.severity === 'high')) {
      setShowLogs(true);
      setIssuesDetected(true);
    }
  };
  
  const clearLogs = () => {
    setLogs([]);
    setIssuesDetected(false);
  };
  
  const toggleDemoMode = () => {
    setDemoMode(!demoMode);
    
    // Add log entry about demo mode
    handleLogEvent({
      id: Math.random().toString(),
      timestamp: new Date(),
      type: 'info',
      message: demoMode ? 'Demo Mode Disabled' : 'Demo Mode Enabled',
      details: demoMode 
        ? 'Reverting to standard operation mode' 
        : 'Additional demo scenarios are now available'
    });
  };

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">IPC Synchronizer</h1>
              <div className="text-xs bg-secondary px-2 py-0.5 rounded-full">Beta</div>
            </div>
            
            <div className="flex items-center gap-2">
              {issuesDetected && !showLogs && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex items-center gap-1 animate-pulse"
                  onClick={() => setShowLogs(true)}
                >
                  <ShieldAlert className="h-4 w-4" />
                  Issues Detected
                </Button>
              )}
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowInfo(!showInfo)}
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>About this app</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={showLogs ? "default" : "outline"}
                      size="icon"
                      onClick={() => setShowLogs(!showLogs)}
                      className={issuesDetected && !showLogs ? "relative" : ""}
                    >
                      <Logs className="h-4 w-4" />
                      {issuesDetected && !showLogs && (
                        <span className="absolute top-0 right-0 w-2 h-2 bg-destructive rounded-full" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Event Logs</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowSidebar(!showSidebar)}
              >
                <SidebarIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>
        
        {/* Info panel */}
        {showInfo && (
          <div className="bg-card border-b border-border p-4 text-sm">
            <h2 className="font-semibold mb-2">About IPC Synchronizer</h2>
            <p className="mb-2">
              This tool helps visualize and debug Inter-Process Communication (IPC) mechanisms like pipes, message queues, and shared memory.
            </p>
            <p className="mb-2">
              Click anywhere on the canvas to create a process, then use the process menu to create connections to other processes. 
              Send data between processes to see communication in action.
            </p>
            <p>
              The tool can detect potential deadlocks and bottlenecks in your IPC communication setup.
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInfo(false)}
              >
                Close
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleDemoMode}
              >
                {demoMode ? 'Disable Demo Mode' : 'Enable Demo Mode'}
              </Button>
            </div>
          </div>
        )}
        
        {/* Main content area - split when logs are shown */}
        <div className="flex-1 overflow-hidden flex">
          {/* Canvas area */}
          <div 
            ref={processCanvasRef} 
            className={`${showLogs ? 'w-2/3' : 'w-full'} h-full`}
          >
            <ProcessCanvas 
              onLogEvent={handleLogEvent}
              demoMode={demoMode}
            />
          </div>
          
          {/* Logs panel */}
          {showLogs && (
            <div className="w-1/3 border-l border-border h-full">
              <LogPanel logs={logs} onClearLogs={clearLogs} />
            </div>
          )}
        </div>
      </div>
      
      {/* Sidebar */}
      {showSidebar && (
        <IPCControlSidebar onResetCanvas={handleReset} />
      )}
    </div>
  );
};

export default IPCSynchronizer;
