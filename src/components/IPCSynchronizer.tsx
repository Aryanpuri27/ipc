
import React, { useState } from 'react';
import ProcessCanvas from './ProcessCanvas';
import IPCControlSidebar from './IPCControlSidebar';
import { Button } from '@/components/ui/button';
import { SidebarIcon, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const IPCSynchronizer: React.FC = () => {
  const [showSidebar, setShowSidebar] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

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
              This tool helps visualize and debug Inter-Process Communication (IPC) mechanisms like pipes and message queues.
            </p>
            <p className="mb-2">
              Click anywhere on the canvas to create a process, then use the process menu to create connections to other processes. 
              Send data between processes to see communication in action.
            </p>
            <p>
              The tool can detect potential deadlocks and bottlenecks in your IPC communication setup.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInfo(false)}
              className="mt-2"
            >
              Close
            </Button>
          </div>
        )}
        
        {/* Main canvas area */}
        <div className="flex-1 overflow-hidden">
          <div ref={processCanvasRef} className="w-full h-full">
            <ProcessCanvas />
          </div>
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
