import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { FiSend, FiPaperclip, FiSettings, FiX, FiFile, FiDownload } from "react-icons/fi";
import useStore from "../store/woo-store";
import ReactMarkdown from "react-markdown";

const ChatInterface = () => {
  const [input, setInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef(null);
  const messages = useStore((state) => state.messages);
  const uploadedFiles = useStore((state) => state.uploadedFiles);
  const isLoading = useStore((state) => state.isLoading);
  const openRouterConfig = useStore((state) => state.openRouterConfig);
  const setSelectedModel = useStore((state) => state.setSelectedModel);
  const addUploadedFile = useStore((state) => state.addUploadedFile);
  const processFileContent = useStore((state) => state.processFileContent);
  const clearUploadedFiles = useStore((state) => state.clearUploadedFiles);
  const removeUploadedFile = useStore((state) => state.removeUploadedFile);
  const generateDownloadableFile = useStore((state) => state.generateDownloadableFile);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 200; // Maximum height in pixels
      textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
      textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    useStore.getState().sendMessage(input);
    setInput("");
    // Reset textarea height after sending
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileUpload = async (files) => {
    if (files && files.length > 0) {
      setIsUploading(true);
      
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          
          // Check file size (limit to 50MB for comprehensive file support)
          if (file.size > 50 * 1024 * 1024) {
            alert(`File ${file.name} is too large. Maximum size is 50MB.`);
            continue;
          }
          
          // Process file content
          const fileData = await processFileContent(file);
          addUploadedFile(fileData);
        }
      } catch (error) {
        console.error('Error processing files:', error);
        alert('Error processing files. Please try again.');
      } finally {
        setIsUploading(false);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };
  
  const handleFileInputChange = async (e) => {
    await handleFileUpload(e.target.files);
  };
  
  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  
  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    await handleFileUpload(files);
  };
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Parse download content from AI responses
  const parseDownloadContent = (content) => {
    const downloadRegex = /```download:([^\n]+)\n([\s\S]*?)```/g;
    const downloads = [];
    let match;
    
    while ((match = downloadRegex.exec(content)) !== null) {
      const filename = match[1].trim();
      const fileContent = match[2].trim();
      downloads.push({ filename, content: fileContent });
    }
    
    return downloads;
  };

  // Handle file download
  const handleDownload = (filename, content) => {
    const fileExtension = filename.split('.').pop().toLowerCase();
    let mimeType = 'text/plain';
    
    switch (fileExtension) {
      case 'csv':
        mimeType = 'text/csv';
        break;
      case 'json':
        mimeType = 'application/json';
        break;
      case 'html':
        mimeType = 'text/html';
        break;
      case 'xml':
        mimeType = 'text/xml';
        break;
      default:
        mimeType = 'text/plain';
    }
    
    const success = generateDownloadableFile(content, filename, mimeType);
    if (!success) {
      alert('Failed to generate download file. Please try again.');
    }
  };

  // Memoized message content renderer for better performance
  const renderMessageContent = useCallback((content) => {
    const downloads = parseDownloadContent(content);
    
    // Helper functions for table functionality
    const tableToCSV = (table) => {
      const rows = Array.from(table.querySelectorAll('tr'));
      return rows.map(row => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        return cells.map(cell => {
          const text = cell.textContent.trim();
          return text.includes(',') || text.includes('"') ? `"${text.replace(/"/g, '""')}"` : text;
        }).join(',');
      }).join('\n');
    };

    const downloadCSV = (csv, filename) => {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    };

    const copyTableToClipboard = async (table) => {
      const csv = tableToCSV(table);
      try {
        await navigator.clipboard.writeText(csv);
        alert('Table data copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy: ', err);
      }
    };

    // Clean content by removing download blocks
    const cleanContent = content.replace(/```download:[^\n]+\n[\s\S]*?```/g, '').trim();
    
    return (
      <>
        <ReactMarkdown components={memoizedMarkdownComponents}>
          {cleanContent}
        </ReactMarkdown>
        
        {downloads.length > 0 && (
          <div className="download-section">
            <h4>📁 Downloads Available:</h4>
            {downloads.map((download, index) => (
              <div key={index} className="download-item">
                <button 
                  className="download-btn"
                  onClick={() => handleDownload(download.filename, download.content)}
                  title={`Download ${download.filename}`}
                >
                  <FiDownload className="download-icon" />
                  <span className="download-filename">{download.filename}</span>
                  <span className="download-size">({formatFileSize(new Blob([download.content]).size)})</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }, []);

  // Memoized markdown components for better performance
  const memoizedMarkdownComponents = useMemo(() => ({
    // Enhanced table rendering with spreadsheet-like styling
    table: ({children, ...props}) => {
      const tableId = `table-${Math.random().toString(36).substr(2, 9)}`;
      return (
        <div className="table-container">
          <div className="table-controls">
            <button 
              className="table-control-btn"
              onClick={() => {
                const table = document.getElementById(tableId);
                if (table) {
                  const csv = tableToCSV(table);
                  downloadCSV(csv, 'table-data.csv');
                }
              }}
              title="Download as CSV"
            >
              📊 Export CSV
            </button>
            <button 
              className="table-control-btn"
              onClick={() => {
                const table = document.getElementById(tableId);
                if (table) {
                  copyTableToClipboard(table);
                }
              }}
              title="Copy to clipboard"
            >
              📋 Copy
            </button>
          </div>
          <div className="table-wrapper">
            <table id={tableId} className="markdown-table spreadsheet-table" {...props}>
              {children}
            </table>
          </div>
        </div>
      );
    },
    
    th: ({children, ...props}) => (
      <th className="markdown-th spreadsheet-header-cell" {...props}>
        <div className="cell-content">
          {children}
        </div>
      </th>
    ),
    
    td: ({children, ...props}) => (
      <td className="markdown-td spreadsheet-cell" {...props}>
        <div className="cell-content">
          {children}
        </div>
      </td>
    ),
    
    tr: ({node, ...props}) => <tr className="markdown-tr spreadsheet-row" {...props} />,
    thead: ({children, ...props}) => (
      <thead className="spreadsheet-header" {...props}>
        {children}
      </thead>
    ),
    tbody: ({node, ...props}) => <tbody className="markdown-tbody" {...props} />,
    
    // Enhanced image rendering with error handling
    img: ({src, alt, title, ...props}) => (
      <div className="image-container">
        <img 
          className="chat-image" 
          src={src} 
          alt={alt} 
          title={title}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'block';
          }}
          {...props} 
        />
        <div className="image-error" style={{display: 'none'}}>
          ❌ Failed to load image: {alt || src}
        </div>
        {(alt || title) && (
          <div className="image-caption">
            {title || alt}
          </div>
        )}
      </div>
    ),
    
    // Enhanced code blocks for better data display
    code: ({node, inline, className, children, ...props}) => {
      if (inline) {
        return <code className="inline-code" {...props}>{children}</code>;
      }
      return (
        <div className="code-container">
          <pre className="code-block">
            <code className={className} {...props}>
              {children}
            </code>
          </pre>
        </div>
      );
    }
  }), []);

  // Performance monitoring component
  const PerformanceMonitor = React.memo(() => {
    const [metrics, setMetrics] = React.useState({
      renderTime: 0,
      messageCount: messages.length,
      memoryUsage: 0
    });

    React.useEffect(() => {
      const startTime = performance.now();
      
      // Monitor memory usage if available
      if (performance.memory) {
        setMetrics(prev => ({
          ...prev,
          memoryUsage: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)
        }));
      }
      
      // Calculate render time
      const endTime = performance.now();
      setMetrics(prev => ({
        ...prev,
        renderTime: Math.round(endTime - startTime),
        messageCount: messages.length
      }));
    }, [messages.length]);

    if (process.env.NODE_ENV === 'development') {
      return (
        <div className="performance-monitor">
          <small>
            📊 Messages: {metrics.messageCount} | 
            ⚡ Render: {metrics.renderTime}ms |
            {metrics.memoryUsage > 0 && ` 🧠 Memory: ${metrics.memoryUsage}MB`}
          </small>
        </div>
      );
    }
    return null;
  });

  // Performance optimized message renderer
  const MessageItem = React.memo(({ msg, index }) => (
    <div key={index} className={`message ${msg.role}`}>
      <div className="message-role">
        {msg.role === "user" ? "You" : "OpenRouter AI"}
      </div>
      <div className="message-content">
        {renderMessageContent(msg.content)}
        {msg.attachments && msg.attachments.length > 0 && (
          <div className="message-attachments">
            <div className="attachments-label">Attached Files:</div>
            {msg.attachments.map((file, fileIndex) => (
              <div key={fileIndex} className="attachment-item">
                <FiFile className="attachment-icon" />
                <span className="attachment-name">{file.name}</span>
                <span className="attachment-size">({formatFileSize(file.size)})</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="message-timestamp">
        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}
      </div>
    </div>
  ));

  return (
    <div 
      className={`flex flex-col h-full bg-white ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag and Drop Overlay */}
      {isDragOver && (
        <div className="drag-overlay">
          <div className="drag-content">
            <FiFile className="drag-icon" />
            <h3>Drop files here</h3>
            <p>Supports all file types: Images, PDFs, Docs, Videos, Audio, Code, ZIPs, etc.</p>
          </div>
        </div>
      )}
      
      {/* Model Selection Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">OpenRouter Model:</label>
          <select 
            id="llm-model-selector"
            value={openRouterConfig.selectedModel} 
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {openRouterConfig.availableModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${openRouterConfig.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span className="text-sm text-gray-700">
            {openRouterConfig.isConnected ? 'Connected to OpenRouter' : 'Not Connected'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <PerformanceMonitor />
        {messages.length === 0 && (
          <div className="welcome-message">
            <h3>Welcome!</h3>
          </div>
        )}
        
        {messages.map((msg, index) => (
          <MessageItem key={`${msg.timestamp || Date.now()}-${index}`} msg={msg} index={index} />
        ))}
        
        {/* Loading Indicator */}
        {isLoading && (
          <div className="message assistant loading">
            <div className="message-role">OpenRouter AI</div>
            <div className="message-content">
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Uploaded Files Display */}
      {uploadedFiles.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Attached Files ({uploadedFiles.length})</span>
            <button 
              type="button" 
              className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
              onClick={clearUploadedFiles}
              title="Clear all files"
            >
              <FiX size={16} />
            </button>
          </div>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-200">
                <FiFile className="text-blue-600" size={16} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-900 truncate block">{file.name}</span>
                  <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                </div>
                <button 
                  type="button" 
                  className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  onClick={() => removeUploadedFile(index)}
                  title="Remove file"
                >
                  <FiX size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-t border-gray-200 bg-white p-4">
        <div className="flex items-end gap-2">
          <button 
            type="button" 
            className={`p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors ${isUploading ? 'animate-pulse' : ''}`} 
            title="Upload files (All file types supported: Images, PDFs, Docs, Videos, Audio, Code, ZIPs, etc.)"
            disabled={isUploading}
            onClick={triggerFileInput}
          >
            <FiPaperclip size={18} />
            {isUploading && <span className="ml-1 text-xs">⟳</span>}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="*/*"
            multiple
            onChange={handleFileInputChange}
            disabled={isUploading}
          />
          <textarea
            ref={textareaRef}
            id="chat-message-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about subscriptions, generate reports, upload files, or type /help for commands..."
            className="flex-1 bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={1}
          />
          <button 
            id="chat-send-button"
            type="submit" 
            className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors" 
            disabled={!input.trim() || isUploading || isLoading}
          >
            <FiSend size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;
