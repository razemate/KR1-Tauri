import { useEncryptedMemory, useAutoSaveConversation, useDownloadableFiles } from '../hooks/useEncryptedMemory';

/**
 * Utility functions for integrating encrypted memory into existing components
 * without modifying their core logic
 */

// Auto-save conversation handler
export const createAutoSaveHandler = (conversationId) => {
  const { autoSave } = useAutoSaveConversation(conversationId);
  
  return {
    // Save a complete conversation turn
    saveConversationTurn: async (userMessage, assistantResponse, metadata = {}) => {
      return await autoSave(userMessage, assistantResponse, {
        ...metadata,
        source: 'auto-save',
        timestamp: new Date().toISOString()
      });
    },
    
    // Save user message only (for immediate storage)
    saveUserMessage: async (message, metadata = {}) => {
      return await autoSave(message, '[PENDING_RESPONSE]', {
        ...metadata,
        type: 'user-only',
        timestamp: new Date().toISOString()
      });
    }
  };
};

// Memory-aware event handlers
export const createMemoryAwareHandlers = () => {
  const memory = useEncryptedMemory();
  const { createAndDownload } = useDownloadableFiles();
  
  return {
    // Wrap existing API call handlers to auto-save results
    wrapApiHandler: (originalHandler, options = {}) => {
      return async (...args) => {
        const result = await originalHandler(...args);
        
        if (result && options.autoSave) {
          const filename = options.filename || `api-result-${Date.now()}`;
          const fileType = options.fileType || 'json';
          
          await createAndDownload(result, filename, fileType);
        }
        
        return result;
      };
    },
    
    // Wrap folder selection handlers
    wrapFolderHandler: (originalHandler) => {
      return async (folderPath, ...args) => {
        const result = await originalHandler(folderPath, ...args);
        
        if (folderPath && result) {
          await memory.addFolderPath(folderPath, {
            addedAt: new Date().toISOString(),
            source: 'user-selection'
          });
        }
        
        return result;
      };
    },
    
    // Wrap search handlers to save search history
    wrapSearchHandler: (originalHandler) => {
      return async (query, ...args) => {
        const result = await originalHandler(query, ...args);
        
        if (query && result) {
          await memory.storeConversation(
            `search-${Date.now()}`,
            `Search: ${query}`,
            `Results: ${JSON.stringify(result)}`,
            {
              type: 'search',
              query,
              resultCount: Array.isArray(result) ? result.length : 1,
              timestamp: new Date().toISOString()
            }
          );
        }
        
        return result;
      };
    }
  };
};

// Higher-order component for memory integration
export const withMemoryIntegration = (WrappedComponent, options = {}) => {
  return function MemoryIntegratedComponent(props) {
    const memory = useEncryptedMemory();
    const { createAndDownload } = useDownloadableFiles();
    
    const memoryProps = {
      memory,
      autoSave: options.autoSave ? createAutoSaveHandler(options.conversationId) : null,
      downloadFile: createAndDownload,
      memoryStats: memory.stats,
      isMemoryReady: memory.isInitialized
    };
    
    return <WrappedComponent {...props} {...memoryProps} />;
  };
};

// Context provider for memory integration
export const MemoryIntegrationProvider = ({ children, conversationId }) => {
  const memory = useEncryptedMemory();
  const autoSave = useAutoSaveConversation(conversationId);
  const { createAndDownload } = useDownloadableFiles();
  
  const contextValue = {
    memory,
    autoSave: autoSave.autoSave,
    downloadFile: createAndDownload,
    handlers: createMemoryAwareHandlers()
  };
  
  return (
    <MemoryContext.Provider value={contextValue}>
      {children}
    </MemoryContext.Provider>
  );
};

// Memory context
import { createContext, useContext } from 'react';

const MemoryContext = createContext(null);

export const useMemoryContext = () => {
  const context = useContext(MemoryContext);
  if (!context) {
    throw new Error('useMemoryContext must be used within a MemoryIntegrationProvider');
  }
  return context;
};

// Utility functions for data processing
export const memoryUtils = {
  // Format conversation for display
  formatConversation: (conversation) => {
    return {
      id: conversation.id,
      timestamp: new Date(conversation.created_at).toLocaleString(),
      userMessage: conversation.user_message,
      assistantResponse: conversation.assistant_response,
      metadata: conversation.metadata ? JSON.parse(conversation.metadata) : {}
    };
  },
  
  // Format folder path for display
  formatFolderPath: (folder) => {
    return {
      id: folder.id,
      path: folder.folder_path,
      addedAt: new Date(folder.created_at).toLocaleString(),
      metadata: folder.metadata ? JSON.parse(folder.metadata) : {}
    };
  },
  
  // Format downloadable file for display
  formatDownloadableFile: (file) => {
    return {
      id: file.id,
      filename: file.filename,
      size: file.file_size,
      type: file.content_type,
      createdAt: new Date(file.created_at).toLocaleString(),
      expiresAt: new Date(file.expires_at).toLocaleString(),
      isExpired: new Date(file.expires_at) < new Date()
    };
  },
  
  // Generate unique conversation ID
  generateConversationId: (prefix = 'conv') => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },
  
  // Extract search terms from query
  extractSearchTerms: (query) => {
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 2)
      .slice(0, 10); // Limit to 10 terms
  },
  
  // Calculate memory usage
  calculateMemoryUsage: (stats) => {
    const { totalConversations, totalMessages, totalFolders, totalFiles, dbSize } = stats;
    
    return {
      conversations: totalConversations,
      messages: totalMessages,
      folders: totalFolders,
      files: totalFiles,
      dbSizeMB: (dbSize / (1024 * 1024)).toFixed(2),
      avgMessagesPerConversation: totalConversations > 0 ? (totalMessages / totalConversations).toFixed(1) : 0
    };
  }
};

// Event listeners for automatic memory integration
export const setupAutoMemoryIntegration = (options = {}) => {
  const { conversationId, enableAutoSave = true, enableAutoDownload = false } = options;
  
  if (enableAutoSave && conversationId) {
    // Listen for chat messages and auto-save them
    const handleChatMessage = (event) => {
      const { userMessage, assistantResponse, metadata } = event.detail;
      const autoSave = createAutoSaveHandler(conversationId);
      autoSave.saveConversationTurn(userMessage, assistantResponse, metadata);
    };
    
    window.addEventListener('chat-message', handleChatMessage);
    
    return () => {
      window.removeEventListener('chat-message', handleChatMessage);
    };
  }
  
  if (enableAutoDownload) {
    // Listen for API responses and auto-download them
    const handleApiResponse = (event) => {
      const { data, endpoint, timestamp } = event.detail;
      const { createAndDownload } = useDownloadableFiles();
      const filename = `${endpoint.replace(/\//g, '-')}-${timestamp}`;
      createAndDownload(data, filename, 'json');
    };
    
    window.addEventListener('api-response', handleApiResponse);
    
    return () => {
      window.removeEventListener('api-response', handleApiResponse);
    };
  }
  
  return () => {}; // No cleanup needed
};

// Memory search utilities
export const memorySearch = {
  // Search conversations with advanced filters
  searchConversations: async (query, filters = {}) => {
    const memory = useEncryptedMemory();
    const { dateFrom, dateTo, type, limit = 50 } = filters;
    
    let searchQuery = query;
    
    if (dateFrom || dateTo) {
      searchQuery += ` date:${dateFrom || ''}..${dateTo || ''}`;
    }
    
    if (type) {
      searchQuery += ` type:${type}`;
    }
    
    const results = await memory.searchConversations(searchQuery, limit);
    return results.map(memoryUtils.formatConversation);
  },
  
  // Get conversation context for AI
  getConversationContext: async (conversationId, messageCount = 10) => {
    const memory = useEncryptedMemory();
    const conversations = await memory.loadConversations(conversationId, messageCount);
    
    return conversations.map(conv => ({
      role: 'user',
      content: conv.user_message
    }).concat({
      role: 'assistant', 
      content: conv.assistant_response
    })).flat();
  },
  
  // Find similar conversations
  findSimilarConversations: async (message, limit = 5) => {
    const memory = useEncryptedMemory();
    const searchTerms = memoryUtils.extractSearchTerms(message);
    const query = searchTerms.join(' OR ');
    
    const results = await memory.searchConversations(query, limit);
    return results.map(memoryUtils.formatConversation);
  }
};

export default {
  createAutoSaveHandler,
  createMemoryAwareHandlers,
  withMemoryIntegration,
  MemoryIntegrationProvider,
  useMemoryContext,
  memoryUtils,
  setupAutoMemoryIntegration,
  memorySearch
};