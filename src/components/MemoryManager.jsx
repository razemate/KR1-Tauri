import React, { useState } from 'react';
import { useMemoryStore } from '../hooks/useMemoryStore';

/**
 * Memory Manager Component - Optional integration for memory management UI
 * Can be added to settings panel or as a standalone component
 */
export function MemoryManager({ className = '' }) {
  const {
    isInitialized,
    memoryEntries,
    storedFiles,
    stats,
    isLoading,
    error,
    searchMemoryEntries,
    removeMemory,
    removeFile,
    cleanup,
    exportData,
    clearError
  } = useMemoryStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await searchMemoryEntries(searchQuery);
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportData();
      if (data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kr1-memory-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleCleanup = async () => {
    if (window.confirm('This will remove old memory entries, keeping only the most recent 1000. Continue?')) {
      await cleanup(1000);
    }
  };

  if (!isInitialized && !isLoading) {
    return (
      <div className={`p-4 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
        <p className="text-yellow-800">Memory system not initialized</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex justify-between items-center">
          <p className="text-red-800">Error: {error}</p>
          <button
            onClick={clearError}
            className="text-red-600 hover:text-red-800 text-sm underline"
          >
            Clear
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Memory Manager</h3>
        <p className="text-sm text-gray-600 mt-1">
          Persistent local storage for conversations and files
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-4" aria-label="Tabs">
          {[
            { id: 'overview', name: 'Overview' },
            { id: 'search', name: 'Search' },
            { id: 'files', name: 'Files' },
            { id: 'manage', name: 'Manage' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.memoryEntries}</div>
                <div className="text-sm text-blue-800">Memory Entries</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.storedFiles}</div>
                <div className="text-sm text-green-800">Stored Files</div>
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              <p>✅ Local SQLite database active</p>
              <p>✅ Offline-first storage</p>
              <p>✅ Automatic conversation backup</p>
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="space-y-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search memory entries..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
            
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((entry) => (
                  <div key={entry.id} className="p-3 bg-gray-50 rounded border">
                    <div className="text-sm text-gray-600 mb-1">
                      {new Date(entry.timestamp).toLocaleString()}
                    </div>
                    <div className="text-sm">
                      {entry.content.length > 200 
                        ? `${entry.content.substring(0, 200)}...` 
                        : entry.content
                      }
                    </div>
                    {entry.tags && (
                      <div className="mt-2">
                        {entry.tags.split(',').map((tag, idx) => (
                          <span key={idx} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="space-y-2">
            {storedFiles.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No files stored</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {storedFiles.map((file) => (
                  <div key={file.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                    <div>
                      <div className="font-medium">{file.filename}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(file.created_at).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <button
                onClick={handleExport}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Export All Data
              </button>
              
              <button
                onClick={handleCleanup}
                className="w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
              >
                Cleanup Old Entries
              </button>
            </div>
            
            <div className="text-sm text-gray-600">
              <p><strong>Export:</strong> Download all memory data as JSON</p>
              <p><strong>Cleanup:</strong> Remove old entries, keep recent 1000</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact Memory Status Component - Can be added to sidebar or header
 */
export function MemoryStatus({ className = '' }) {
  const { isInitialized, stats, error } = useMemoryStore();

  if (error) {
    return (
      <div className={`flex items-center space-x-2 text-red-600 ${className}`}>
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <span className="text-xs">Memory Error</span>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className={`flex items-center space-x-2 text-yellow-600 ${className}`}>
        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
        <span className="text-xs">Memory Loading</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 text-green-600 ${className}`}>
      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
      <span className="text-xs">
        {stats.memoryEntries} memories, {stats.storedFiles} files
      </span>
    </div>
  );
}