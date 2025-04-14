
import { Toaster } from "@/components/ui/toaster";
import IPCSynchronizer from "@/components/IPCSynchronizer";

const Index = () => {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <IPCSynchronizer />
      <Toaster />
    </div>
  );
};

export default Index;
