/**
 * Memory Integration Utilities
 * 
 * These utilities can be imported into existing components to add memory functionality
 * without modifying the core component logic.
 */

import { useMemoryStore } from '../hooks/useMemoryStore';
import { saveMemory, saveFile } from '../services/memoryService';

/**
 * Auto-save conversation turns to memory
 * Call this function after each AI response to persist the conversation
 * 
 * @param {string} userMessage - The user's message
 * @param {string} aiResponse - The AI's response
 * @param {string} sessionId - Optional session identifier
 * @param {Object} metadata - Optional metadata (model used, timestamp, etc.)
 */
export async function autoSaveConversation(userMessage, aiResponse, sessionId = null, metadata = {}) {
  try {
    const conversationTurn = {
      userMessage,
      aiResponse,
      sessionId,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };
    
    const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const content = JSON.stringify(conversationTurn);
    const tags = [
      'conversation',
      sessionId ? `session:${sessionId}` : 'no-session',
      metadata.model ? `model:${metadata.model}` : '',
      metadata.mode ? `mode:${metadata.mode}` : ''
    ].filter(Boolean).join(',');
    
    await saveMemory(id, content, conversationTurn.metadata.timestamp, tags);
    
    console.log('Conversation auto-saved to memory');
    return true;
  } catch (error) {
    console.error('Failed to auto-save conversation:', error);
    return false;
  }
}

/**
 * Auto-save uploaded files to memory
 * Call this function when files are uploaded to persist them locally
 * 
 * @param {File} file - The uploaded file
 * @param {string} sessionId - Optional session identifier
 */
export async function autoSaveUploadedFile(file, sessionId = null) {
  try {
    const id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date().toISOString();
    
    // Convert file to base64 for storage
    const content = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    
    await saveFile(id, file.name, content, createdAt);
    
    // Also save file metadata to memory
    const fileMetadata = {
      fileId: id,
      filename: file.name,
      size: file.size,
      type: file.type,
      sessionId,
      uploadedAt: createdAt
    };
    
    const memoryId = `file_meta_${id}`;
    const memoryContent = JSON.stringify(fileMetadata);
    const tags = [
      'file-upload',
      `filename:${file.name}`,
      `type:${file.type}`,
      sessionId ? `session:${sessionId}` : 'no-session'
    ].join(',');
    
    await saveMemory(memoryId, memoryContent, createdAt, tags);
    
    console.log('File auto-saved to memory:', file.name);
    return { fileId: id, memoryId };
  } catch (error) {
    console.error('Failed to auto-save file:', error);
    return null;
  }
}

/**
 * Save app state/settings to memory
 * Useful for preserving app configuration and user preferences
 * 
 * @param {Object} state - The state object to save
 * @param {string} stateType - Type identifier (e.g., 'settings', 'preferences')
 */
export async function saveAppState(state, stateType = 'app-state') {
  try {
    const id = `state_${stateType}_${Date.now()}`;
    const timestamp = new Date().toISOString();
    const content = JSON.stringify(state);
    const tags = `app-state,${stateType}`;
    
    await saveMemory(id, content, timestamp, tags);
    
    console.log('App state saved to memory:', stateType);
    return id;
  } catch (error) {
    console.error('Failed to save app state:', error);
    return null;
  }
}

/**
 * Create a memory-enhanced version of any component
 * This HOC adds memory functionality to existing components
 * 
 * @param {React.Component} WrappedComponent - Component to enhance
 * @param {Object} options - Configuration options
 */
export function withMemory(WrappedComponent, options = {}) {
  const {
    autoSaveConversations = true,
    autoSaveFiles = true,
    autoSaveState = false,
    sessionIdProvider = null
  } = options;
  
  return function MemoryEnhancedComponent(props) {
    const memoryStore = useMemoryStore();
    
    // Enhanced props with memory functionality
    const enhancedProps = {
      ...props,
      memory: {
        ...memoryStore,
        autoSaveConversation: autoSaveConversations ? autoSaveConversation : null,
        autoSaveFile: autoSaveFiles ? autoSaveUploadedFile : null,
        saveState: autoSaveState ? saveAppState : null,
        getSessionId: sessionIdProvider
      }
    };
    
    return React.createElement(WrappedComponent, enhancedProps);
  };
}

/**
 * Memory-aware message handler
 * Wraps existing message handlers to add automatic memory persistence
 * 
 * @param {Function} originalHandler - Original message handler function
 * @param {Object} options - Configuration options
 */
export function createMemoryAwareHandler(originalHandler, options = {}) {
  const {
    sessionIdProvider = () => null,
    extractMetadata = () => ({}),
    shouldSave = () => true
  } = options;
  
  return async function memoryAwareHandler(...args) {
    // Call the original handler
    const result = await originalHandler(...args);
    
    // Extract conversation data from the result or args
    const [userMessage, ...otherArgs] = args;
    const aiResponse = typeof result === 'string' ? result : result?.message || result?.response;
    
    // Auto-save if conditions are met
    if (shouldSave(userMessage, aiResponse, ...otherArgs) && userMessage && aiResponse) {
      const sessionId = sessionIdProvider(...args);
      const metadata = extractMetadata(...args, result);
      
      await autoSaveConversation(userMessage, aiResponse, sessionId, metadata);
    }
    
    return result;
  };
}

/**
 * Utility to create memory-backed offline fallbacks
 * When external APIs are unavailable, fall back to local memory
 * 
 * @param {Function} onlineHandler - Handler for online mode
 * @param {Function} offlineHandler - Handler for offline mode using memory
 * @param {Function} connectivityCheck - Function to check if online
 */
export function createOfflineFallback(onlineHandler, offlineHandler, connectivityCheck = () => navigator.onLine) {
  return async function fallbackHandler(...args) {
    try {
      if (connectivityCheck()) {
        return await onlineHandler(...args);
      } else {
        console.log('Offline mode: using memory fallback');
        return await offlineHandler(...args);
      }
    } catch (error) {
      console.warn('Online handler failed, falling back to memory:', error);
      return await offlineHandler(...args);
    }
  };
}

/**
 * Memory search utilities for finding relevant context
 * 
 * @param {string} query - Search query
 * @param {Object} options - Search options
 */
export async function searchMemoryContext(query, options = {}) {
  const {
    limit = 10,
    includeFiles = false,
    sessionId = null,
    timeRange = null // { start: Date, end: Date }
  } = options;
  
  try {
    const { searchMemoryEntries } = useMemoryStore();
    
    let searchQuery = query;
    
    // Add session filter if specified
    if (sessionId) {
      searchQuery += ` session:${sessionId}`;
    }
    
    const results = await searchMemoryEntries(searchQuery);
    
    // Filter by time range if specified
    let filteredResults = results;
    if (timeRange) {
      filteredResults = results.filter(entry => {
        const entryTime = new Date(entry.timestamp);
        return entryTime >= timeRange.start && entryTime <= timeRange.end;
      });
    }
    
    // Filter out files if not requested
    if (!includeFiles) {
      filteredResults = filteredResults.filter(entry => 
        !entry.tags?.includes('file-upload')
      );
    }
    
    return filteredResults.slice(0, limit);
  } catch (error) {
    console.error('Memory search failed:', error);
    return [];
  }
}

/**
 * Export memory integration status
 */
export function getMemoryIntegrationStatus() {
  return {
    isAvailable: true,
    features: {
      autoSaveConversations: true,
      autoSaveFiles: true,
      offlineFallback: true,
      contextSearch: true,
      stateManagement: true
    },
    version: '1.0.0'
  };
}