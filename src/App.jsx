import { useState } from "react";
import Sidebar from "./components/Sidebar";
import ChatInterface from "./components/ChatInterface";
import SettingsPanel from "./components/SettingsPanel";
import useStore from "./store/woo-store";

export default function App() {
  const [sources, setSources] = useState([
    { id: "woo",      name: "WooCommerce",       enabled: true, locked: true },
    { id: "mgw",      name: "MerchantGuyGateway",enabled: true, locked: true },
    { id: "zendesk",  name: "Zendesk",           enabled: false, locked: false },
    { id: "ontraport",name: "Ontraport",         enabled: false, locked: false },
    { id: "ga",       name: "Google Analytics",  enabled: false, locked: false },
  ]);

  const { activeTab } = useStore();

  return (
    <div className="h-screen bg-gray-100 text-gray-900 overflow-hidden">
      <div className="flex h-full">
        <Sidebar sources={sources} setSources={setSources} />
        <div className="flex-1 flex flex-col">
          {activeTab === 'settings' ? (
            <SettingsPanel />
          ) : (
            <ChatInterface sources={sources} />
          )}
        </div>
      </div>
    </div>
  );
}
