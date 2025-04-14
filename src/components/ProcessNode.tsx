
import React, { useState } from 'react';
import { Process, Position, IPCType } from '@/lib/types';
import { 
  MoreVertical, 
  Trash2, 
  PipetteIcon, 
  MessageSquare, 
  Database, 
  Send,
  Hand
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProcessNodeProps {
  process: Process;
  onStartConnection: (processId: string, type: IPCType) => void;
  onCompleteConnection: (processId: string) => void;
  onSendData: (targetProcessId: string) => void;
  onRemove: () => void;
  connectMode: {
    active: boolean;
    fromProcess?: string;
    type: IPCType;
  };
  connectionOptions: Array<{
    processId: string;
    processName: string;
    type: IPCType;
  }>;
}

const ProcessNode: React.FC<ProcessNodeProps> = ({
  process,
  onStartConnection,
  onCompleteConnection,
  onSendData,
  onRemove,
  connectMode,
  connectionOptions
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [position, setPosition] = useState<Position>(process.position);

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  // Handle mouse move for dragging
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newPosition = {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      };
      setPosition(newPosition);
      
      // Update process position in parent component
      process.position = newPosition;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, process]);

  // Handle node click
  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (connectMode.active && connectMode.fromProcess !== process.id) {
      onCompleteConnection(process.id);
    }
  };

  return (
    <div
      className={`process-node absolute w-48 p-4 cursor-grab ${
        connectMode.active && connectMode.fromProcess !== process.id
          ? 'ring-2 ring-primary'
          : ''
      } ${process.state === 'blocked' ? 'bg-muted/50' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
        zIndex: isDragging ? 10 : 1,
      }}
      onClick={handleNodeClick}
      onMouseDown={handleMouseDown}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium truncate">{process.name}</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onStartConnection(process.id, 'pipe');
              }}
            >
              <PipetteIcon className="mr-2 h-4 w-4 text-pipe" />
              Create Pipe
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onStartConnection(process.id, 'queue');
              }}
            >
              <MessageSquare className="mr-2 h-4 w-4 text-queue" />
              Create Message Queue
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onStartConnection(process.id, 'memory');
              }}
              disabled={false} // Enabling shared memory option
            >
              <Database className="mr-2 h-4 w-4 text-memory" />
              Create Shared Memory
            </DropdownMenuItem>
            
            {connectionOptions.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Send Data To</DropdownMenuLabel>
                {connectionOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.processId}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSendData(option.processId);
                    }}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {option.processName}
                    <span className="ml-1 text-xs opacity-70">
                      ({option.type})
                    </span>
                  </DropdownMenuItem>
                ))}
              </>
            )}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove Process
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <div className="text-xs text-muted-foreground mb-2">
        State: <span className="font-medium">{process.state}</span>
      </div>
      
      <div className="text-xs text-muted-foreground">
        Connections: <span className="font-medium">{connectionOptions.length}</span>
      </div>

      {process.waitingFor && (
        <div className="text-xs text-amber-500 mt-2">
          Waiting for resources...
        </div>
      )}
    </div>
  );
};

export default ProcessNode;
