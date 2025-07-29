import React, { useState } from 'react';
import useStore from '../store/woo-store';
import kr1Logo from '../assets/kr1-logo.png';
import SettingsPanel from './SettingsPanel';

const Sidebar = () => {
  const { 
    activeTab, 
    setActiveTab, 
    chatSessions, 
    currentSessionId, 
    createNewSession, 
    loadSession,
    showAllHistory,
    setShowAllHistory,
    updateSessionTitle,
    toggleSessionPin,
    deleteSession,
    activeConnectedApps,
    isAppActive,
    toggleConnectedApp,
    isCreatingSession,
    setIsCreatingSession,
    appMode,
    modeIndicator,
    validatedApps
  } = useStore();
  
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  
  const allApps = [
    { key: 'woocommerce', name: 'WooCommerce', icon: '🛒' },
    { key: 'zendesk', name: 'Zendesk', icon: '🎫' },
    { key: 'googleanalytics', name: 'Google Analytics', icon: '📊' },
    { key: 'ontraport', name: 'Ontraport', icon: '📧' },
    { key: 'merchantguy', name: 'Merchantguygateway', icon: '💳' }
  ];
  
  // Show all validated apps, regardless of their toggle state
  const connectedApps = allApps.filter(app => validatedApps.has(app.key));
  
  // Sort sessions: pinned first, then by timestamp (newest first)
  const sortedSessions = [...chatSessions].sort((a, b) => {
    // Pinned sessions come first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    // Then sort by timestamp
    return new Date(b.lastUpdated || b.timestamp) - new Date(a.lastUpdated || a.timestamp);
  });
  
  const displayedSessions = showAllHistory ? sortedSessions : sortedSessions.slice(0, 5);
  
  const handleNewChat = () => {
    setIsCreatingSession(true);
    try {
      // Check if there's an existing empty session (no messages)
      const emptySession = chatSessions.find(session => 
        (!session.messages || session.messages.length === 0) && 
        session.title === 'New Chat'
      );
      
      if (emptySession) {
        // Load the existing empty session instead of creating a new one
        loadSession(emptySession.id);
      } else {
        // Create a new session
        const sessionId = createNewSession();
        if (sessionId) {
          loadSession(sessionId);
        }
      }
    } finally {
      setIsCreatingSession(false);
    }
  };
  
  const handleLoadSession = (sessionId) => {
    loadSession(sessionId);
  };
  
  const handleDeleteSession = (sessionId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this chat session?')) {
      deleteSession(sessionId);
    }
  };

  const handleRenameSession = (sessionId, currentTitle, e) => {
    e.stopPropagation();
    setEditingSessionId(sessionId);
    setEditingTitle(currentTitle || 'New Chat');
  };

  const handleSaveRename = (sessionId, e) => {
    e.stopPropagation();
    if (editingTitle.trim()) {
      updateSessionTitle(sessionId, editingTitle.trim());
    }
    setEditingSessionId(null);
    setEditingTitle('');
  };

  const handleCancelRename = (e) => {
    e.stopPropagation();
    setEditingSessionId(null);
    setEditingTitle('');
  };

  const handlePinSession = (sessionId, e) => {
    e.stopPropagation();
    toggleSessionPin(sessionId);
  };
  
  const formatChatPreview = (session) => {
    return session.title || 'New Chat';
  };
  
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };
  
  return (
    <div className="w-full md:w-80 h-full bg-white border-r border-gray-200 p-1 md:p-2 overflow-y-auto flex flex-col gap-1 md:gap-2">
      {/* App Logo */}
      <div className="flex items-center justify-center py-0.5 md:py-1">
        <img src={kr1Logo} style={{ width: "96px", height: "96px" }} />
      </div>
      
      {/* App Mode Indicator */}
      <div className="flex justify-end p-0.5">
        <span className={`w-2.5 h-2.5 rounded-full ${
          modeIndicator.color === 'green' ? 'bg-green-500' : 
          modeIndicator.color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
        }`}></span>
      </div>
      
      {/* Settings Panel */}
      {activeTab === 'settings' && (
        <div className="flex flex-col gap-0.5 md:gap-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-700 m-0 p-0 uppercase tracking-wide">Settings</h3>
            <button 
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-all duration-200 border border-gray-300 hover:border-gray-400"
              onClick={() => setActiveTab('chat')}
              title="Close Settings"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SettingsPanel />
          </div>
        </div>
      )}
      
      {/* Navigation Buttons */}
        {activeTab !== 'settings' && (
          <div className="flex flex-col gap-0.5 md:gap-1">
            <button 
              className={`flex items-center justify-center gap-1 w-full px-2 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
               activeTab === 'chat' ? 'bg-gradient-to-r from-blue-500 to-green-500 text-white shadow-blue-500/30' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
             }`}
             onClick={() => {
               setActiveTab('chat');
               if (activeTab !== 'chat') {
                 handleNewChat();
               }
             }} 
             disabled={isCreatingSession}
           >
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
               <path d="M12 5v14M5 12h14" />
             </svg>
             {isCreatingSession ? 'Creating...' : 'New Chat'}
           </button>
           

           
           <button 
              className={`flex items-center justify-center gap-1 w-full px-2 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
               activeTab === 'settings' ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-blue-500/30' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
             }`}
             onClick={() => setActiveTab('settings')}
           >
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
               <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
               <circle cx="12" cy="12" r="3"/>
             </svg>
             Settings
           </button>
         </div>
       )}
      
      {/* Connected Apps Section */}
       {activeTab !== 'settings' && (
         <div className="flex flex-col gap-0.5 md:gap-1">
           <h3 className="text-xs font-semibold text-gray-700 m-0 p-0 uppercase tracking-wide">Connected Apps</h3>
           <div className="flex flex-col gap-0.5">
             {connectedApps.length === 0 ? (
               <div className="text-center py-1 md:py-2 text-gray-500">
                 <p className="m-0 mb-1 text-xs">No apps connected</p>
                 <button
                   className="px-1.5 md:px-2 py-0.5 md:py-1 bg-gradient-to-r from-blue-500 to-green-500 text-white border-none rounded-md cursor-pointer text-xs font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-blue-500/30"
                   onClick={() => useStore.getState().setActiveTab('settings')}
                 >
                   Connect Apps
                 </button>
               </div>
             ) : (
               connectedApps.map((app) => (
                 <div key={app.key} className="flex items-center justify-between p-1.5 md:p-2 bg-gray-50 rounded-md border border-gray-200">
                   <div className="flex items-center gap-1 md:gap-2">
                     <span className="text-xs md:text-sm">{app.icon}</span>
                     <span className="text-xs text-gray-700 font-medium">{app.name}</span>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                     <input
                       type="checkbox"
                       checked={isAppActive(app.key)}
                       onChange={() => {
                         toggleConnectedApp(app.key);
                       }}
                       className="sr-only peer"
                     />
                     <div className="w-7 h-4 md:w-9 md:h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-3 after:w-3 md:after:h-4 md:after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                   </label>
                 </div>
               ))
             )}
           </div>
         </div>
       )}
       
       {/* Chat History Section */}
       {activeTab !== 'settings' && (
         <div className="flex flex-col gap-0.5 md:gap-1">
           <h3 className="text-xs font-semibold text-gray-700 m-0 p-0 uppercase tracking-wide">Chat History</h3>
           <div className="flex flex-col gap-0.5 md:gap-1">
             {displayedSessions.length === 0 ? (
               <p className="text-center py-1 md:py-2 text-gray-500 text-xs">No chat history yet</p>
             ) : (
               <>
                 {displayedSessions.map((session) => (
                   <div
                     key={session.id}
                     className={`group relative p-1.5 md:p-2 rounded-md cursor-pointer transition-all duration-200 ${
                       currentSessionId === session.id ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                     } ${session.isPinned ? 'border-l-4 border-l-yellow-500' : ''}`}
                     onClick={() => handleLoadSession(session.id)}
                   >
                     <div className="flex-1">
                       {editingSessionId === session.id ? (
                         <div className="flex items-center gap-1">
                           <input
                             type="text"
                             value={editingTitle}
                             onChange={(e) => setEditingTitle(e.target.value)}
                             onKeyDown={(e) => {
                               if (e.key === 'Enter') handleSaveRename(session.id, e);
                               if (e.key === 'Escape') handleCancelRename(e);
                             }}
                             className="flex-1 px-1 md:px-2 py-1 bg-white text-gray-900 text-xs rounded border border-gray-300 focus:outline-none focus:border-blue-500"
                             autoFocus
                           />
                           <div className="flex gap-1">
                             <button onClick={(e) => handleSaveRename(session.id, e)} className="p-0.5 text-green-600 hover:text-green-700 text-xs">✓</button>
                             <button onClick={handleCancelRename} className="p-0.5 text-red-600 hover:text-red-700 text-xs">×</button>
                           </div>
                         </div>
                       ) : (
                         <>
                           <div className="text-gray-900 text-xs font-medium truncate">
                             {session.isPinned && <span className="text-yellow-500 mr-1">📌</span>}
                             {formatChatPreview(session)}
                           </div>
                           <div className="text-gray-500 text-xs mt-0.5">
                             {formatTimestamp(session.lastUpdated || session.timestamp)}
                           </div>
                         </>
                       )}
                     </div>
                     <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                       <button 
                         className="p-0.5 text-gray-400 hover:text-yellow-500 text-xs"
                         onClick={(e) => handlePinSession(session.id, e)}
                         title={session.isPinned ? 'Unpin session' : 'Pin session'}
                       >
                         {session.isPinned ? '📌' : '📍'}
                       </button>
                       <button 
                         className="p-0.5 text-gray-400 hover:text-blue-600 text-xs"
                         onClick={(e) => handleRenameSession(session.id, session.title, e)}
                         title="Rename session"
                       >
                         ✏️
                       </button>
                       <button 
                         className="p-0.5 text-gray-400 hover:text-red-600 text-xs"
                         onClick={(e) => handleDeleteSession(session.id, e)}
                         title="Delete session"
                       >
                         🗑️
                       </button>
                     </div>
                   </div>
                 ))}
                 
                 {chatSessions.length > 5 && (
                   <button 
                     className="w-full py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors border border-gray-300 rounded-md"
                     onClick={() => setShowAllHistory(!showAllHistory)}
                   >
                     {showAllHistory ? 'Show Less' : `Show All (${chatSessions.length})`}
                   </button>
                 )}
               </>
             )}
           </div>
         </div>
       )}
    </div>
  );
};

export default Sidebar;






