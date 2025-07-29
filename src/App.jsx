import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ChatInterface from "./components/ChatInterface";
import ResizableLayout from "./components/ResizableLayout";
import useStore from "./store/woo-store";

export default function App() {
  const [sources, setSources] = useState([
    { id: "woo",      name: "WooCommerce",       enabled: true, locked: true },
    { id: "merchantguy", name: "Merchantguygateway", enabled: true, locked: true },
    { id: "zendesk",  name: "Zendesk",           enabled: false, locked: false },
    { id: "ontraport",name: "Ontraport",         enabled: false, locked: false },
    { id: "ga",       name: "Google Analytics",  enabled: false, locked: false },
  ]);



  // Initialize the store when the app starts
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await useStore.getState().init();
        console.log('App initialized successfully');
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };
    
    initializeApp();
  }, []);

  return (
    <div className="h-screen bg-gray-100 text-gray-900 overflow-hidden">
      {/* Mobile responsive layout */}
      <div className="block md:hidden h-full">
        {/* Mobile: Stack vertically, sidebar can be toggled */}
        <div className="flex flex-col h-full">
          <div className="flex-shrink-0">
            <Sidebar sources={sources} setSources={setSources} />
          </div>
          <div className="flex-1 min-h-0">
            <ChatInterface sources={sources} />
          </div>
        </div>
      </div>
      
      {/* Desktop: Resizable layout */}
      <div className="hidden md:block h-full w-full overflow-hidden">
        <ResizableLayout
          leftPanel={<Sidebar sources={sources} setSources={setSources} />}
          rightPanel={<ChatInterface sources={sources} />}
          minLeftWidth={250}
          maxLeftWidth={500}
          defaultLeftWidth={320}
        />
      </div>
    </div>
  );
}
