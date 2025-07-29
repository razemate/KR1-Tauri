# 🧠 Encrypted Memory System for KR1 Application

## Overview

The Encrypted Memory System provides unlimited persistent AI memory with SQLCipher encryption, supporting conversation storage, folder path tracking, and auto-expiring file generation. The system is designed for seamless integration without modifying existing components.

## 🔒 Security Features

- **SQLCipher Encryption**: AES-256 encryption for all stored data
- **Automatic Key Management**: No password prompts, keys stored in Windows Credential Manager
- **Local Storage Only**: No cloud sync, all data remains on device
- **Transparent Storage**: No metadata obfuscation, files stored as-is
- **Online-Only Design**: No offline fallback logic

## 📁 File Structure

```
src/
├── services/
│   └── encryptedMemoryService.js     # Core Tauri-based memory service
├── hooks/
│   └── useEncryptedMemory.js          # React hook for memory management
├── utils/
│   └── encryptedMemoryIntegration.js  # Integration utilities
├── components/
│   ├── EncryptedMemoryManager.jsx     # UI management component
│   └── EncryptedMemoryDemo.jsx        # Demo and examples
src-tauri/
├── src/
│   ├── encryption.rs                  # Rust encryption key management
│   └── main.rs                        # Updated with encryption commands
├── Cargo.toml                         # Updated dependencies
└── tauri.conf.json                    # SQL plugin enabled
```

## 🚀 Installation & Setup

### 1. Dependencies Already Installed

The following have been added to your project:

**Frontend (pnpm):**
- `@tauri-apps/plugin-sql` - SQLite integration

**Backend (Cargo.toml):**
- `rand = "0.8"` - Random key generation
- `hex = "0.4"` - Hex encoding
- `winapi` - Windows Credential Manager (Windows only)

### 2. Configuration Updated

**tauri.conf.json:**
```json
{
  "plugins": {
    "sql": {
      "enabled": true
    }
  }
}
```

### 3. Rust Backend

The Rust backend includes:
- Encryption key management via Windows Credential Manager
- Tauri commands for key operations
- Platform-specific implementations

## 📖 Usage Guide

### Quick Integration

```javascript
import { useEncryptedMemory } from './hooks/useEncryptedMemory';

function MyComponent() {
  const memory = useEncryptedMemory();
  
  // Auto-initializes on mount
  if (!memory.isInitialized) {
    return <div>Initializing encrypted memory...</div>;
  }
  
  // Use memory functions
  const saveConversation = async () => {
    await memory.storeConversation(
      'conv-123',
      'User message',
      'Assistant response'
    );
  };
  
  return (
    <div>
      <button onClick={saveConversation}>Save Conversation</button>
      <p>Total conversations: {memory.stats.totalConversations}</p>
    </div>
  );
}
```

### Auto-Save Conversations

```javascript
import { useAutoSaveConversation } from './hooks/useEncryptedMemory';

function ChatComponent() {
  const conversationId = 'chat-session-123';
  const { autoSave } = useAutoSaveConversation(conversationId);
  
  const handleMessage = async (userMsg, assistantMsg) => {
    // Automatically saves to encrypted memory
    await autoSave(userMsg, assistantMsg, {
      timestamp: new Date().toISOString(),
      source: 'chat'
    });
  };
  
  return <div>Chat interface...</div>;
}
```

### Memory-Aware API Handlers

```javascript
import { createMemoryAwareHandlers } from './utils/encryptedMemoryIntegration';

function ApiComponent() {
  const handlers = createMemoryAwareHandlers();
  
  // Wrap existing API handler to auto-generate downloadable files
  const enhancedApiCall = handlers.wrapApiHandler(
    originalApiFunction,
    { autoSave: true, filename: 'api-result', fileType: 'json' }
  );
  
  return <button onClick={() => enhancedApiCall('/orders')}>Get Orders</button>;
}
```

### Folder Path Tracking

```javascript
function FolderSelector() {
  const memory = useEncryptedMemory();
  
  const handleFolderSelect = async (folderPath) => {
    await memory.addFolderPath(folderPath, {
      selectedAt: new Date().toISOString(),
      source: 'user-selection'
    });
  };
  
  return <input onChange={(e) => handleFolderSelect(e.target.value)} />;
}
```

### File Generation with Auto-Expiry

```javascript
import { useDownloadableFiles } from './hooks/useEncryptedMemory';

function DataExporter() {
  const { createAndDownload } = useDownloadableFiles();
  
  const exportData = async (data) => {
    // Creates downloadable file that expires in 2 hours
    await createAndDownload(data, 'export-data', 'json');
  };
  
  return <button onClick={() => exportData(myData)}>Export Data</button>;
}
```

## 🎛️ UI Components

### Full Memory Manager

```javascript
import EncryptedMemoryManager from './components/EncryptedMemoryManager';

function App() {
  return (
    <div>
      <EncryptedMemoryManager />
    </div>
  );
}
```

### Compact Status Display

```javascript
import { MemoryStatusCompact } from './components/EncryptedMemoryManager';

function Header() {
  return (
    <header>
      <MemoryStatusCompact compact={true} />
    </header>
  );
}
```

### Demo Component

```javascript
import EncryptedMemoryDemo from './components/EncryptedMemoryDemo';

// Shows integration examples and testing interface
<EncryptedMemoryDemo />
```

## 🔍 Search Capabilities

### Basic Search

```javascript
const results = await memory.searchConversations('user query');
```

### Advanced Search

```javascript
import { memorySearch } from './utils/encryptedMemoryIntegration';

const results = await memorySearch.searchConversations('query', {
  dateFrom: '2024-01-01',
  dateTo: '2024-12-31',
  type: 'chat',
  limit: 100
});
```

### Find Similar Conversations

```javascript
const similar = await memorySearch.findSimilarConversations(
  'current user message',
  5 // limit
);
```

## 🛠️ Management Features

### Statistics

```javascript
const stats = memory.stats;
console.log({
  conversations: stats.totalConversations,
  messages: stats.totalMessages,
  folders: stats.totalFolders,
  files: stats.totalFiles,
  dbSizeMB: (stats.dbSize / (1024 * 1024)).toFixed(2)
});
```

### Cleanup

```javascript
// Remove expired files
const cleanedCount = await memory.cleanupExpiredFiles();

// Delete specific conversation
await memory.deleteConversation('conversation-id');

// Delete folder path
await memory.deleteFolderPath('folder-id');
```

### Export Data

```javascript
// Export all conversations
const conversations = await memory.loadConversations(null, 1000);
await createAndDownload(conversations, 'all-conversations', 'json');

// Export folder paths
const folders = await memory.getFolderPaths();
await createAndDownload(folders, 'folder-paths', 'csv');
```

## 🔧 Advanced Integration

### Higher-Order Component

```javascript
import { withMemoryIntegration } from './utils/encryptedMemoryIntegration';

const EnhancedComponent = withMemoryIntegration(
  MyComponent,
  { autoSave: true, conversationId: 'my-conv' }
);
```

### Context Provider

```javascript
import { MemoryIntegrationProvider } from './utils/encryptedMemoryIntegration';

function App() {
  return (
    <MemoryIntegrationProvider conversationId="app-session">
      <MyComponents />
    </MemoryIntegrationProvider>
  );
}
```

### Event-Based Integration

```javascript
import { setupAutoMemoryIntegration } from './utils/encryptedMemoryIntegration';

// Auto-save on custom events
const cleanup = setupAutoMemoryIntegration({
  conversationId: 'event-session',
  enableAutoSave: true,
  enableAutoDownload: true
});

// Trigger events
window.dispatchEvent(new CustomEvent('chat-message', {
  detail: {
    userMessage: 'Hello',
    assistantResponse: 'Hi there!',
    metadata: { source: 'chat' }
  }
}));

// Cleanup when done
cleanup();
```

## 📊 Database Schema

### Conversations Table

```sql
CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL,
    user_message TEXT NOT NULL,
    assistant_response TEXT NOT NULL,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Folder Paths Table

```sql
CREATE TABLE folder_paths (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_path TEXT UNIQUE NOT NULL,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Generated Files Table

```sql
CREATE TABLE generated_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    content_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## ⚡ Performance

- **Database Size**: Unlimited (disk space constrained)
- **Search Speed**: Full-text search with SQLite FTS
- **Auto-Cleanup**: Every 30 minutes for expired files
- **File Expiry**: 2 hours after creation
- **Memory Usage**: Minimal, lazy loading

## 🔒 Security Considerations

1. **Encryption Keys**: Stored in Windows Credential Manager
2. **Database Location**: Local app data directory
3. **No Network Access**: All operations are local
4. **Key Rotation**: Manual via management interface
5. **Backup**: User responsible for database backup

## 🐛 Troubleshooting

### Common Issues

**Memory not initializing:**
```javascript
// Check if SQL plugin is enabled in tauri.conf.json
// Verify Windows Credential Manager access
// Check console for encryption key errors
```

**Search not working:**
```javascript
// Ensure FTS tables are created
// Check for special characters in search query
// Verify database is not corrupted
```

**Files not expiring:**
```javascript
// Manual cleanup
await memory.cleanupExpiredFiles();

// Check system clock
// Verify cleanup interval is running
```

### Debug Mode

```javascript
// Enable debug logging
const memory = useEncryptedMemory();
console.log('Memory state:', {
  initialized: memory.isInitialized,
  loading: memory.isLoading,
  error: memory.error,
  stats: memory.stats
});
```

## 📈 Monitoring

### Memory Usage

```javascript
const usage = memoryUtils.calculateMemoryUsage(memory.stats);
console.log({
  conversations: usage.conversations,
  avgMessagesPerConversation: usage.avgMessagesPerConversation,
  dbSizeMB: usage.dbSizeMB
});
```

### Health Check

```javascript
const healthCheck = async () => {
  try {
    await memory.refreshStats();
    return { status: 'healthy', stats: memory.stats };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
};
```

## 🎯 Best Practices

1. **Conversation IDs**: Use meaningful, unique identifiers
2. **Metadata**: Include relevant context for search
3. **Cleanup**: Regular maintenance of expired files
4. **Error Handling**: Always handle memory operation failures
5. **Performance**: Limit search results and conversation loads
6. **Security**: Never log encryption keys or sensitive data

## 🔄 Migration

If upgrading from a previous memory system:

1. Export existing data
2. Initialize new encrypted memory
3. Import data using batch operations
4. Verify data integrity
5. Remove old system

## 📞 Support

For issues or questions:

1. Check console for error messages
2. Verify all dependencies are installed
3. Test with the demo component
4. Review this documentation
5. Check Tauri and SQLite logs

---

**Note**: This system is designed for the KR1 application and follows the requirement of not modifying existing working files. All integration is additive and non-destructive.