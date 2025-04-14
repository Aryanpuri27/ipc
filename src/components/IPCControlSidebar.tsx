import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PipetteIcon, MessageSquare, Database, BarChart, Settings } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface IPCControlSidebarProps {
  onResetCanvas: () => void;
}

const IPCControlSidebar: React.FC<IPCControlSidebarProps> = ({ onResetCanvas }) => {
  const [simulationSpeed, setSimulationSpeed] = useState<number[]>([50]);
  const [autoDetectDeadlocks, setAutoDetectDeadlocks] = useState(true);
  
  return (
    <div className="w-80 h-full p-4 bg-card border-l border-border overflow-y-auto">
      <Tabs defaultValue="ipc-types">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="ipc-types">IPC Types</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="ipc-types">
          <Card>
            <CardHeader>
              <CardTitle>IPC Mechanisms</CardTitle>
              <CardDescription>
                Different ways processes can communicate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <PipetteIcon className="h-5 w-5 text-pipe" />
                  <h3 className="font-medium">Pipes</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Bi-directional communication channel. Data flows in both directions.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-queue" />
                  <h3 className="font-medium">Message Queues</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  One-way channel with buffering. Has a defined capacity.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-memory" />
                  <h3 className="font-medium">Shared Memory</h3>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                    Coming soon
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Allows multiple processes to access the same memory region.
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Usage Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>1. Click on the canvas to create a process</p>
              <p>2. Click the menu on a process to create IPC connections</p>
              <p>3. Send data between processes to see communication</p>
              <p>4. Observe for bottlenecks and deadlocks</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analysis">
          <Card>
            <CardHeader>
              <CardTitle>IPC Analysis</CardTitle>
              <CardDescription>
                Tools for detecting issues in your IPC setup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <BarChart className="h-4 w-4" />
                  Deadlock Detection
                </h3>
                <p className="text-sm text-muted-foreground">
                  Detects when processes are waiting for each other in a circular pattern
                </p>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch 
                    id="deadlock-detection"
                    checked={autoDetectDeadlocks}
                    onCheckedChange={setAutoDetectDeadlocks}
                  />
                  <Label htmlFor="deadlock-detection">Auto-detect deadlocks</Label>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Bottleneck Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Identifies when message queues are approaching capacity
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-xs">Queue &gt; 80% capacity</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive"></div>
                  <span className="text-xs">Queue at capacity</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Simulation Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="sim-speed">Simulation Speed</Label>
                  <span className="text-sm text-muted-foreground">
                    {simulationSpeed[0]}%
                  </span>
                </div>
                <Slider 
                  id="sim-speed"
                  min={10} 
                  max={100} 
                  step={10} 
                  value={simulationSpeed} 
                  onValueChange={setSimulationSpeed} 
                />
              </div>
              
              <Separator />
              
              <div className="pt-2">
                <Button 
                  variant="destructive"
                  onClick={onResetCanvas}
                  className="w-full"
                >
                  Reset Canvas
                </Button>
              </div>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground">
              <p>IPC Synchronizer v1.0.0</p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IPCControlSidebar;
