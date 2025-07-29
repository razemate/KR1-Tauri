/**
 * Memory System Demo Component
 * 
 * This component demonstrates how the memory system can be integrated
 * into existing components without modifying their core functionality.
 * 
 * It can be optionally imported and used to test memory features.
 */

import React, { useState, useEffect } from 'react';
import { useMemoryStore } from '../hooks/useMemoryStore';
import {
  autoSaveConversation,
  autoSaveUploadedFile,
  searchMemoryContext,
  createMemoryAwareHandler,
  getMemoryIntegrationStatus
} from '../utils/memoryIntegration';

const MemoryDemo = () => {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    isInitialized,
    initializeMemory,
    addMemoryEntry,
    searchMemoryEntries,
    getMemoryStats,
    removeMemoryEntry
  } = useMemoryStore();

  useEffect(() => {
    // Initialize memory system on component mount
    if (!isInitialized) {
      initializeMemory();
    }
    
    // Get integration status
    setStatus(getMemoryIntegrationStatus());
  }, [isInitialized, initializeMemory]);

  // Demo: Simulate a conversation and auto-save it
  const handleSimulateConversation = async () => {
    if (!message.trim()) return;
    
    setIsLoading(true);
    
    try {
      // Simulate AI response (in real app, this would come from your AI service)
      const simulatedResponse = `AI Response to: "${message}". This is a demo response that shows how conversations can be automatically saved to local memory.`;
      setResponse(simulatedResponse);
      
      // Auto-save the conversation
      const success = await autoSaveConversation(
        message,
        simulatedResponse,
        'demo-session',
        {
          model: 'demo-model',
          mode: 'demo',
          timestamp: new Date().toISOString()
        }
      );
      
      if (success) {
        alert('Conversation saved to memory!');
      }
      
    } catch (error) {
      console.error('Demo conversation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Demo: File upload simulation
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setIsLoading(true);
    
    try {
      const result = await autoSaveUploadedFile(file, 'demo-session');
      
      if (result) {
        alert(`File "${file.name}" saved to memory!`);
      }
      
    } catch (error) {
      console.error('Demo file upload failed:', error);
    } finally {
      setIsLoading(false);
      event.target.value = ''; // Reset file input
    }
  };

  // Demo: Search memory
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    
    try {
      const results = await searchMemoryContext(searchQuery, {
        limit: 5,
        includeFiles: true,
        sessionId: 'demo-session'
      });
      
      setSearchResults(results);
      
    } catch (error) {
      console.error('Demo search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Demo: Memory-aware handler
  const memoryAwareMessageHandler = createMemoryAwareHandler(
    async (userMsg) => {
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      return `Processed: ${userMsg}`;
    },
    {
      sessionIdProvider: () => 'demo-session',
      extractMetadata: (userMsg) => ({ 
        messageLength: userMsg.length,
        timestamp: new Date().toISOString()
      }),
      shouldSave: (userMsg) => userMsg.length > 5
    }
  );

  const handleMemoryAwareDemo = async () => {
    if (!message.trim()) return;
    
    setIsLoading(true);
    
    try {
      const result = await memoryAwareMessageHandler(message);
      setResponse(result);
      alert('Message processed and automatically saved!');
    } catch (error) {
      console.error('Memory-aware demo failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">Initializing memory system...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          🧠 Memory System Demo
        </h2>
        
        {status && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-green-800 text-sm">
              Memory Integration Status: ✅ Available (v{status.version})
            </p>
          </div>
        )}

        {/* Conversation Demo */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">💬 Auto-Save Conversations</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message to simulate conversation..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSimulateConversation}
                disabled={isLoading || !message.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Simulate & Save Conversation'}
              </button>
              <button
                onClick={handleMemoryAwareDemo}
                disabled={isLoading || !message.trim()}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
              >
                Memory-Aware Handler Demo
              </button>
            </div>
            {response && (
              <div className="p-3 bg-gray-50 border rounded-lg">
                <p className="text-gray-700">{response}</p>
              </div>
            )}
          </div>
        </div>

        {/* File Upload Demo */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">📁 Auto-Save Files</h3>
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={isLoading}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-sm text-gray-600 mt-1">
            Upload any file to see it saved to local memory
          </p>
        </div>

        {/* Search Demo */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">🔍 Search Memory</h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations and files..."
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                onClick={handleSearch}
                disabled={isLoading || !searchQuery.trim()}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                Search
              </button>
            </div>
            
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700">Search Results:</h4>
                {searchResults.map((result, index) => (
                  <div key={index} className="p-3 bg-gray-50 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-gray-500">
                        {new Date(result.timestamp).toLocaleString()}
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {result.tags}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 truncate">
                      {typeof result.content === 'string' 
                        ? result.content.substring(0, 100) + '...'
                        : JSON.stringify(result.content).substring(0, 100) + '...'
                      }
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Integration Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            🔧 Integration Instructions
          </h3>
          <div className="text-sm text-blue-700 space-y-2">
            <p>
              <strong>To integrate memory into existing components:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Import <code>useMemoryStore</code> hook for direct memory access</li>
              <li>Use <code>autoSaveConversation()</code> after AI responses</li>
              <li>Use <code>autoSaveUploadedFile()</code> for file uploads</li>
              <li>Wrap handlers with <code>createMemoryAwareHandler()</code></li>
              <li>Use <code>searchMemoryContext()</code> for context retrieval</li>
              <li>Add <code>withMemory()</code> HOC for automatic enhancement</li>
            </ul>
            <p className="mt-3">
              <strong>Example:</strong> In ChatBox.jsx, add one line after AI response:
              <br />
              <code className="bg-white px-2 py-1 rounded">
                await autoSaveConversation(userMessage, aiResponse, sessionId);
              </code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemoryDemo;