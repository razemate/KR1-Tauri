import React, { useState, useEffect } from 'react';
import { useEncryptedMemory, useDownloadableFiles } from '../hooks/useEncryptedMemory';
import { memoryUtils, memorySearch } from '../utils/encryptedMemoryIntegration';

/**
 * Encrypted Memory Manager Component
 * Provides UI for managing persistent encrypted memory
 * Can be integrated into existing components without modification
 */
const EncryptedMemoryManager = ({ className = '', compact = false }) => {
  const memory = useEncryptedMemory();
  const { createAndDownload } = useDownloadableFiles();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Load data when component mounts or tab changes
  useEffect(() => {
    if (!memory.isInitialized) return;
    
    const loadData = async () => {
      try {
        switch (activeTab) {
          case 'conversations':
            const convs = await memory.loadConversations(null, 50);
            setConversations(convs.map(memoryUtils.formatConversation));
            break;
          case 'folders':
            const folderPaths = await memory.getFolderPaths();
            setFolders(folderPaths.map(memoryUtils.formatFolderPath));
            break;
          case 'files':
            const downloadableFiles = await memory.getDownloadableFiles();
            setFiles(downloadableFiles.map(memoryUtils.formatDownloadableFile));
            break;
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    
    loadData();
  }, [activeTab, memory.isInitialized]);

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await memorySearch.searchConversations(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle export
  const handleExport = async (type) => {
    try {
      let data, filename;
      
      switch (type) {
        case 'conversations':
          data = await memory.loadConversations(null, 1000);
          filename = `conversations-export-${new Date().toISOString().split('T')[0]}`;
          break;
        case 'folders':
          data = await memory.getFolderPaths();
          filename = `folders-export-${new Date().toISOString().split('T')[0]}`;
          break;
        case 'stats':
          data = memoryUtils.calculateMemoryUsage(memory.stats);
          filename = `memory-stats-${new Date().toISOString().split('T')[0]}`;
          break;
        default:
          return;
      }
      
      await createAndDownload(data, filename, 'json');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Handle cleanup
  const handleCleanup = async () => {
    try {
      const cleanedCount = await memory.cleanupExpiredFiles();
      alert(`Cleaned up ${cleanedCount} expired files`);
      await memory.refreshStats();
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  };

  if (compact) {
    return (
      <MemoryStatusCompact 
        stats={memory.stats} 
        isInitialized={memory.isInitialized}
        error={memory.error}
        className={className}
      />
    );
  }

  if (!memory.isInitialized) {
    return (
      <div className={`memory-manager ${className}`}>
        <div className="memory-loading">
          <div className="loading-spinner"></div>
          <p>Initializing encrypted memory system...</p>
          {memory.error && (
            <div className="error-message">
              Error: {memory.error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`memory-manager ${className}`}>
      <div className="memory-header">
        <h2>🧠 Encrypted Memory System</h2>
        <div className="memory-stats">
          <span>Conversations: {memory.stats.totalConversations}</span>
          <span>Messages: {memory.stats.totalMessages}</span>
          <span>Folders: {memory.stats.totalFolders}</span>
          <span>Files: {memory.stats.totalFiles}</span>
          <span>DB Size: {memoryUtils.calculateMemoryUsage(memory.stats).dbSizeMB} MB</span>
        </div>
      </div>

      {memory.error && (
        <div className="error-banner">
          ⚠️ {memory.error}
          <button onClick={memory.clearError}>×</button>
        </div>
      )}

      <div className="memory-tabs">
        {['overview', 'search', 'conversations', 'folders', 'files', 'management'].map(tab => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="memory-content">
        {activeTab === 'overview' && (
          <MemoryOverview stats={memory.stats} />
        )}

        {activeTab === 'search' && (
          <MemorySearch
            query={searchQuery}
            setQuery={setSearchQuery}
            onSearch={handleSearch}
            results={searchResults}
            isSearching={isSearching}
          />
        )}

        {activeTab === 'conversations' && (
          <ConversationsList
            conversations={conversations}
            onDelete={memory.deleteConversation}
            onExport={() => handleExport('conversations')}
          />
        )}

        {activeTab === 'folders' && (
          <FoldersList
            folders={folders}
            onDelete={memory.deleteFolderPath}
            onExport={() => handleExport('folders')}
          />
        )}

        {activeTab === 'files' && (
          <FilesList
            files={files}
            onCleanup={handleCleanup}
          />
        )}

        {activeTab === 'management' && (
          <MemoryManagement
            onExport={handleExport}
            onCleanup={handleCleanup}
            stats={memory.stats}
          />
        )}
      </div>
    </div>
  );
};

// Compact status component
const MemoryStatusCompact = ({ stats, isInitialized, error, className }) => {
  const usage = memoryUtils.calculateMemoryUsage(stats);
  
  return (
    <div className={`memory-status-compact ${className}`}>
      <div className="status-indicator">
        <span className={`status-dot ${isInitialized ? 'active' : 'inactive'}`}></span>
        <span className="status-text">
          {isInitialized ? '🧠 Memory Active' : '🧠 Memory Inactive'}
        </span>
      </div>
      {isInitialized && (
        <div className="status-stats">
          <span>{usage.conversations} conversations</span>
          <span>{usage.dbSizeMB} MB</span>
        </div>
      )}
      {error && (
        <div className="status-error">⚠️ Error</div>
      )}
    </div>
  );
};

// Overview component
const MemoryOverview = ({ stats }) => {
  const usage = memoryUtils.calculateMemoryUsage(stats);
  
  return (
    <div className="memory-overview">
      <div className="overview-grid">
        <div className="stat-card">
          <h3>💬 Conversations</h3>
          <div className="stat-value">{usage.conversations}</div>
          <div className="stat-detail">Avg {usage.avgMessagesPerConversation} messages each</div>
        </div>
        
        <div className="stat-card">
          <h3>📁 Folders</h3>
          <div className="stat-value">{usage.folders}</div>
          <div className="stat-detail">Tracked paths</div>
        </div>
        
        <div className="stat-card">
          <h3>📄 Files</h3>
          <div className="stat-value">{usage.files}</div>
          <div className="stat-detail">Generated downloads</div>
        </div>
        
        <div className="stat-card">
          <h3>💾 Storage</h3>
          <div className="stat-value">{usage.dbSizeMB} MB</div>
          <div className="stat-detail">Encrypted database</div>
        </div>
      </div>
      
      <div className="overview-info">
        <h4>🔒 Security Features</h4>
        <ul>
          <li>✅ SQLCipher encryption (AES-256)</li>
          <li>✅ Automatic key management</li>
          <li>✅ No password prompts</li>
          <li>✅ Local storage only</li>
        </ul>
      </div>
    </div>
  );
};

// Search component
const MemorySearch = ({ query, setQuery, onSearch, results, isSearching }) => {
  return (
    <div className="memory-search">
      <div className="search-input">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations, messages, and metadata..."
          onKeyPress={(e) => e.key === 'Enter' && onSearch()}
        />
        <button onClick={onSearch} disabled={isSearching}>
          {isSearching ? '🔍 Searching...' : '🔍 Search'}
        </button>
      </div>
      
      <div className="search-results">
        {results.length > 0 ? (
          <div className="results-list">
            <h4>Found {results.length} results:</h4>
            {results.map(result => (
              <div key={result.id} className="result-item">
                <div className="result-timestamp">{result.timestamp}</div>
                <div className="result-user">{result.userMessage}</div>
                <div className="result-assistant">{result.assistantResponse.substring(0, 200)}...</div>
              </div>
            ))}
          </div>
        ) : query && !isSearching ? (
          <div className="no-results">No results found for "{query}"</div>
        ) : null}
      </div>
    </div>
  );
};

// Conversations list component
const ConversationsList = ({ conversations, onDelete, onExport }) => {
  return (
    <div className="conversations-list">
      <div className="list-header">
        <h4>Recent Conversations</h4>
        <button onClick={onExport}>📥 Export All</button>
      </div>
      
      <div className="list-items">
        {conversations.map(conv => (
          <div key={conv.id} className="conversation-item">
            <div className="conversation-header">
              <span className="conversation-time">{conv.timestamp}</span>
              <button onClick={() => onDelete(conv.id)}>🗑️</button>
            </div>
            <div className="conversation-preview">
              <div className="user-message">{conv.userMessage}</div>
              <div className="assistant-message">{conv.assistantResponse.substring(0, 150)}...</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Folders list component
const FoldersList = ({ folders, onDelete, onExport }) => {
  return (
    <div className="folders-list">
      <div className="list-header">
        <h4>Tracked Folders</h4>
        <button onClick={onExport}>📥 Export All</button>
      </div>
      
      <div className="list-items">
        {folders.map(folder => (
          <div key={folder.id} className="folder-item">
            <div className="folder-header">
              <span className="folder-path">{folder.path}</span>
              <button onClick={() => onDelete(folder.id)}>🗑️</button>
            </div>
            <div className="folder-details">
              <span>Added: {folder.addedAt}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Files list component
const FilesList = ({ files, onCleanup }) => {
  return (
    <div className="files-list">
      <div className="list-header">
        <h4>Generated Files</h4>
        <button onClick={onCleanup}>🧹 Cleanup Expired</button>
      </div>
      
      <div className="list-items">
        {files.map(file => (
          <div key={file.id} className={`file-item ${file.isExpired ? 'expired' : ''}`}>
            <div className="file-header">
              <span className="file-name">{file.filename}</span>
              <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
            </div>
            <div className="file-details">
              <span>Created: {file.createdAt}</span>
              <span>Expires: {file.expiresAt}</span>
              {file.isExpired && <span className="expired-badge">EXPIRED</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Management component
const MemoryManagement = ({ onExport, onCleanup, stats }) => {
  return (
    <div className="memory-management">
      <div className="management-section">
        <h4>📥 Export Data</h4>
        <div className="export-buttons">
          <button onClick={() => onExport('conversations')}>Export Conversations</button>
          <button onClick={() => onExport('folders')}>Export Folders</button>
          <button onClick={() => onExport('stats')}>Export Statistics</button>
        </div>
      </div>
      
      <div className="management-section">
        <h4>🧹 Maintenance</h4>
        <div className="maintenance-buttons">
          <button onClick={onCleanup}>Cleanup Expired Files</button>
        </div>
      </div>
      
      <div className="management-section">
        <h4>ℹ️ System Information</h4>
        <div className="system-info">
          <p>Database Location: Local encrypted SQLite</p>
          <p>Encryption: AES-256 via SQLCipher</p>
          <p>Auto-cleanup: Every 30 minutes</p>
          <p>File Expiry: 2 hours after creation</p>
        </div>
      </div>
    </div>
  );
};

export default EncryptedMemoryManager;
export { MemoryStatusCompact };