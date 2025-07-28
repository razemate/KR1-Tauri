import React, { useState } from 'react';
import useStore from '../store/woo-store';

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
    isCreatingSession
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
  
  const connectedApps = allApps.filter(app => activeConnectedApps.includes(app.key));
  
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
    const last = chatSessions[chatSessions.length - 1];
    // skip creation if last session is empty
    if (last && last.title.trim() === "New Chat") {
      // Load the existing empty session instead of creating a new one
      loadSession(last.id);
      return;
    }

    const sessionId = createNewSession();
    if (sessionId) {
      loadSession(sessionId);
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
    <div className="w-80 bg-white border-r border-gray-200 p-5 overflow-y-auto flex flex-col gap-5">
      {/* Navigation Buttons */}
      <div className="flex flex-col gap-2">
        <button 
          className={`flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {isCreatingSession ? 'Creating...' : 'New Chat'}
        </button>
        
        <button 
          className={`flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
            activeTab === 'settings' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-purple-500/30' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => setActiveTab('settings')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          Settings
        </button>
      </div>
      
      {/* Connected Apps Section */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-700 m-0 uppercase tracking-wide">Connected Apps</h3>
        <div className="flex flex-col gap-2">
          {connectedApps.length === 0 ? (
            <div className="text-center py-5 text-gray-500">
              <p className="m-0 mb-3 text-sm">No apps connected</p>
              <button
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-green-500 text-white border-none rounded-md cursor-pointer text-xs font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-blue-500/30"
                onClick={() => useStore.getState().setActiveTab('settings')}
              >
                Connect Apps
              </button>
            </div>
          ) : (
            connectedApps.map((app) => (
              <div key={app.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{app.icon}</span>
                  <span className="text-sm text-gray-700 font-medium">{app.name}</span>
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
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Chat History Section */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-700 m-0 uppercase tracking-wide">Chat History</h3>
        <div className="flex flex-col gap-2">
          {displayedSessions.length === 0 ? (
            <p className="text-center py-4 text-gray-500 text-sm">No chat history yet</p>
          ) : (
            <>
              {displayedSessions.map((session) => (
                <div
                  key={session.id}
                  className={`group relative p-3 rounded-md cursor-pointer transition-all duration-200 ${
                    currentSessionId === session.id ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                  } ${session.isPinned ? 'border-l-4 border-l-yellow-500' : ''}`}
                  onClick={() => handleLoadSession(session.id)}
                >
                  <div className="flex-1">
                    {editingSessionId === session.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(session.id, e);
                            if (e.key === 'Escape') handleCancelRename(e);
                          }}
                          className="flex-1 px-2 py-1 bg-white text-gray-900 text-sm rounded border border-gray-300 focus:outline-none focus:border-blue-500"
                          autoFocus
                        />
                        <div className="flex gap-1">
                          <button onClick={(e) => handleSaveRename(session.id, e)} className="p-1 text-green-600 hover:text-green-700 text-sm">✓</button>
                          <button onClick={handleCancelRename} className="p-1 text-red-600 hover:text-red-700 text-sm">×</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-gray-900 text-sm font-medium truncate">
                          {session.isPinned && <span className="text-yellow-500 mr-1">📌</span>}
                          {formatChatPreview(session)}
                        </div>
                        <div className="text-gray-500 text-xs mt-1">
                          {formatTimestamp(session.lastUpdated || session.timestamp)}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button 
                      className="p-1 text-gray-400 hover:text-yellow-500 text-xs"
                      onClick={(e) => handlePinSession(session.id, e)}
                      title={session.isPinned ? 'Unpin session' : 'Pin session'}
                    >
                      {session.isPinned ? '📌' : '📍'}
                    </button>
                    <button 
                      className="p-1 text-gray-400 hover:text-blue-600 text-xs"
                      onClick={(e) => handleRenameSession(session.id, session.title, e)}
                      title="Rename session"
                    >
                      ✏️
                    </button>
                    <button 
                      className="p-1 text-gray-400 hover:text-red-600 text-xs"
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
                  className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors border border-gray-300 rounded-md"
                  onClick={() => setShowAllHistory(!showAllHistory)}
                >
                  {showAllHistory ? 'Show Less' : `Show All (${chatSessions.length})`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;