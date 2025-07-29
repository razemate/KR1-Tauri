import { useState, useEffect, useCallback } from 'react';
import {
  initMemoryDB,
  saveMemory,
  getAllMemory,
  searchMemory,
  deleteMemory,
  saveFile,
  getAllFiles,
  getFile,
  deleteFile,
  getMemoryStats,
  cleanupOldMemory,
  exportMemoryData
} from '../services/memoryService';

/**
 * Custom hook for managing persistent memory and file storage
 * @returns {Object} Memory store methods and state
 */
export function useMemoryStore() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [memoryEntries, setMemoryEntries] = useState([]);
  const [storedFiles, setStoredFiles] = useState([]);
  const [stats, setStats] = useState({ memoryEntries: 0, storedFiles: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Initialize the memory database
   */
  const initialize = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const success = await initMemoryDB();
      if (success) {
        setIsInitialized(true);
        await refreshData();
      } else {
        setError('Failed to initialize memory database');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh all data from the database
   */
  const refreshData = useCallback(async () => {
    try {
      const [memory, files, statistics] = await Promise.all([
        getAllMemory(),
        getAllFiles(),
        getMemoryStats()
      ]);
      
      setMemoryEntries(memory);
      setStoredFiles(files);
      setStats(statistics);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  /**
   * Add a new memory entry
   */
  const addMemory = useCallback(async (content, tags = '') => {
    try {
      const id = `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = new Date().toISOString();
      
      const success = await saveMemory(id, content, timestamp, tags);
      if (success) {
        await refreshData();
        return id;
      }
      return null;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [refreshData]);

  /**
   * Search memory entries
   */
  const searchMemoryEntries = useCallback(async (query) => {
    try {
      return await searchMemory(query);
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, []);

  /**
   * Remove a memory entry
   */
  const removeMemory = useCallback(async (id) => {
    try {
      const success = await deleteMemory(id);
      if (success) {
        await refreshData();
      }
      return success;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, [refreshData]);

  /**
   * Store a file
   */
  const storeFile = useCallback(async (filename, content) => {
    try {
      const id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const createdAt = new Date().toISOString();
      
      const success = await saveFile(id, filename, content, createdAt);
      if (success) {
        await refreshData();
        return id;
      }
      return null;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [refreshData]);

  /**
   * Retrieve a file by ID
   */
  const retrieveFile = useCallback(async (id) => {
    try {
      return await getFile(id);
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  /**
   * Remove a file
   */
  const removeFile = useCallback(async (id) => {
    try {
      const success = await deleteFile(id);
      if (success) {
        await refreshData();
      }
      return success;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, [refreshData]);

  /**
   * Clean up old memory entries
   */
  const cleanup = useCallback(async (keepCount = 1000) => {
    try {
      const success = await cleanupOldMemory(keepCount);
      if (success) {
        await refreshData();
      }
      return success;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, [refreshData]);

  /**
   * Export all data
   */
  const exportData = useCallback(async () => {
    try {
      return await exportMemoryData();
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  /**
   * Save conversation turn to memory
   */
  const saveConversationTurn = useCallback(async (userMessage, aiResponse, sessionId = null) => {
    try {
      const conversationData = {
        userMessage,
        aiResponse,
        sessionId,
        timestamp: new Date().toISOString()
      };
      
      const content = JSON.stringify(conversationData);
      const tags = `conversation,${sessionId ? `session:${sessionId}` : 'no-session'}`;
      
      return await addMemory(content, tags);
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [addMemory]);

  /**
   * Get conversation history for a session
   */
  const getConversationHistory = useCallback(async (sessionId) => {
    try {
      const results = await searchMemoryEntries(`session:${sessionId}`);
      return results.map(entry => {
        try {
          return JSON.parse(entry.content);
        } catch {
          return null;
        }
      }).filter(Boolean);
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, [searchMemoryEntries]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    // State
    isInitialized,
    memoryEntries,
    storedFiles,
    stats,
    isLoading,
    error,
    
    // Methods
    initialize,
    refreshData,
    addMemory,
    searchMemoryEntries,
    removeMemory,
    storeFile,
    retrieveFile,
    removeFile,
    cleanup,
    exportData,
    saveConversationTurn,
    getConversationHistory,
    clearError
  };
}