import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

/**
 * React hook for managing encrypted persistent memory
 * Provides seamless integration with SQLCipher-encrypted SQLite database
 */
export const useEncryptedMemory = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalConversations: 0,
    totalMessages: 0,
    totalFolders: 0,
    totalFiles: 0,
    dbSize: 0
  });

  // Initialize the encrypted memory system
  const initialize = useCallback(async () => {
    if (isInitialized) return true;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await invoke('encryptedMemoryService.initialize');
      setIsInitialized(true);
      await refreshStats();
      return true;
    } catch (err) {
      setError(`Failed to initialize memory system: ${err}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  // Store a conversation turn (user message + assistant response)
  const storeConversation = useCallback(async (conversationId, userMessage, assistantResponse, metadata = {}) => {
    try {
      await invoke('encryptedMemoryService.storeConversation', {
        conversationId,
        userMessage,
        assistantResponse,
        metadata: JSON.stringify(metadata)
      });
      await refreshStats();
      return true;
    } catch (err) {
      setError(`Failed to store conversation: ${err}`);
      return false;
    }
  }, []);

  // Load conversation history
  const loadConversations = useCallback(async (conversationId = null, limit = 100) => {
    try {
      const conversations = await invoke('encryptedMemoryService.loadConversations', {
        conversationId,
        limit
      });
      return conversations;
    } catch (err) {
      setError(`Failed to load conversations: ${err}`);
      return [];
    }
  }, []);

  // Search conversations
  const searchConversations = useCallback(async (query, limit = 50) => {
    try {
      const results = await invoke('encryptedMemoryService.searchConversations', {
        query,
        limit
      });
      return results;
    } catch (err) {
      setError(`Failed to search conversations: ${err}`);
      return [];
    }
  }, []);

  // Add folder path
  const addFolderPath = useCallback(async (folderPath, metadata = {}) => {
    try {
      await invoke('encryptedMemoryService.addFolderPath', {
        folderPath,
        metadata: JSON.stringify(metadata)
      });
      await refreshStats();
      return true;
    } catch (err) {
      setError(`Failed to add folder path: ${err}`);
      return false;
    }
  }, []);

  // Get folder paths
  const getFolderPaths = useCallback(async () => {
    try {
      const folders = await invoke('encryptedMemoryService.getFolderPaths');
      return folders;
    } catch (err) {
      setError(`Failed to get folder paths: ${err}`);
      return [];
    }
  }, []);

  // Generate downloadable file
  const generateDownloadableFile = useCallback(async (filename, content, contentType = 'application/json') => {
    try {
      const fileInfo = await invoke('encryptedMemoryService.generateDownloadableFile', {
        filename,
        content,
        contentType
      });
      await refreshStats();
      return fileInfo;
    } catch (err) {
      setError(`Failed to generate downloadable file: ${err}`);
      return null;
    }
  }, []);

  // Get downloadable files
  const getDownloadableFiles = useCallback(async () => {
    try {
      const files = await invoke('encryptedMemoryService.getDownloadableFiles');
      return files;
    } catch (err) {
      setError(`Failed to get downloadable files: ${err}`);
      return [];
    }
  }, []);

  // Clean up expired files
  const cleanupExpiredFiles = useCallback(async () => {
    try {
      const cleanedCount = await invoke('encryptedMemoryService.cleanupExpiredFiles');
      await refreshStats();
      return cleanedCount;
    } catch (err) {
      setError(`Failed to cleanup expired files: ${err}`);
      return 0;
    }
  }, []);

  // Get memory statistics
  const refreshStats = useCallback(async () => {
    try {
      const newStats = await invoke('encryptedMemoryService.getStats');
      setStats(newStats);
      return newStats;
    } catch (err) {
      setError(`Failed to get stats: ${err}`);
      return stats;
    }
  }, [stats]);

  // Delete conversation
  const deleteConversation = useCallback(async (conversationId) => {
    try {
      await invoke('encryptedMemoryService.deleteConversation', { conversationId });
      await refreshStats();
      return true;
    } catch (err) {
      setError(`Failed to delete conversation: ${err}`);
      return false;
    }
  }, []);

  // Delete folder path
  const deleteFolderPath = useCallback(async (folderId) => {
    try {
      await invoke('encryptedMemoryService.deleteFolderPath', { folderId });
      await refreshStats();
      return true;
    } catch (err) {
      setError(`Failed to delete folder path: ${err}`);
      return false;
    }
  }, []);

  // Auto-initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Auto-cleanup expired files every 30 minutes
  useEffect(() => {
    if (!isInitialized) return;
    
    const interval = setInterval(() => {
      cleanupExpiredFiles();
    }, 30 * 60 * 1000); // 30 minutes
    
    return () => clearInterval(interval);
  }, [isInitialized, cleanupExpiredFiles]);

  // Clear error after 10 seconds
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => setError(null), 10000);
      return () => clearTimeout(timeout);
    }
  }, [error]);

  return {
    // State
    isInitialized,
    isLoading,
    error,
    stats,
    
    // Actions
    initialize,
    storeConversation,
    loadConversations,
    searchConversations,
    addFolderPath,
    getFolderPaths,
    generateDownloadableFile,
    getDownloadableFiles,
    cleanupExpiredFiles,
    refreshStats,
    deleteConversation,
    deleteFolderPath,
    
    // Utilities
    clearError: () => setError(null)
  };
};

// Helper function for auto-saving conversations
export const useAutoSaveConversation = (conversationId) => {
  const { storeConversation } = useEncryptedMemory();
  
  const autoSave = useCallback(async (userMessage, assistantResponse, metadata = {}) => {
    if (!conversationId || !userMessage || !assistantResponse) return false;
    
    return await storeConversation(
      conversationId,
      userMessage,
      assistantResponse,
      {
        ...metadata,
        autoSaved: true,
        timestamp: new Date().toISOString()
      }
    );
  }, [conversationId, storeConversation]);
  
  return { autoSave };
};

// Helper function for managing downloadable files
export const useDownloadableFiles = () => {
  const { generateDownloadableFile, getDownloadableFiles, cleanupExpiredFiles } = useEncryptedMemory();
  
  const createAndDownload = useCallback(async (data, filename, type = 'json') => {
    let content, contentType, finalFilename;
    
    switch (type) {
      case 'json':
        content = JSON.stringify(data, null, 2);
        contentType = 'application/json';
        finalFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
        break;
      case 'csv':
        content = convertToCSV(data);
        contentType = 'text/csv';
        finalFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
        break;
      case 'txt':
        content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        contentType = 'text/plain';
        finalFilename = filename.endsWith('.txt') ? filename : `${filename}.txt`;
        break;
      default:
        throw new Error(`Unsupported file type: ${type}`);
    }
    
    const fileInfo = await generateDownloadableFile(finalFilename, content, contentType);
    
    if (fileInfo) {
      // Trigger download
      const blob = new Blob([content], { type: contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = finalFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    
    return fileInfo;
  }, [generateDownloadableFile]);
  
  return {
    createAndDownload,
    getDownloadableFiles,
    cleanupExpiredFiles
  };
};

// Utility function to convert data to CSV
function convertToCSV(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        const stringValue = value === null || value === undefined ? '' : String(value);
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')
          ? `"${stringValue.replace(/"/g, '""')}"`
          : stringValue;
      }).join(',')
    )
  ].join('\n');
  
  return csvContent;
}

export default useEncryptedMemory;