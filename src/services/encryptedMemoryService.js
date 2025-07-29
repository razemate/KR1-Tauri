/**
 * Encrypted Memory Service
 * 
 * Provides unlimited persistent AI memory with transparent encryption
 * using Tauri's SQL plugin with SQLite encryption capabilities.
 * 
 * Features:
 * - Unlimited memory storage (disk space limited)
 * - Transparent encryption (no password prompts)
 * - Conversation persistence
 * - Folder path management
 * - Auto-expiring file generation
 * - Online-only architecture
 */

import Database from '@tauri-apps/plugin-sql';
import { invoke } from '@tauri-apps/api/tauri';
import { appDataDir, join } from '@tauri-apps/api/path';
import { exists, createDir, writeTextFile, removeFile } from '@tauri-apps/api/fs';
import { v4 as uuidv4 } from 'uuid';

class EncryptedMemoryService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.encryptionKey = null;
    this.expiryJobs = new Map(); // Track file expiry jobs
  }

  /**
   * Initialize the encrypted memory database
   */
  async initialize() {
    try {
      if (this.isInitialized) return true;

      // Generate or retrieve encryption key
      this.encryptionKey = await this.getOrCreateEncryptionKey();
      
      // Get app data directory
      const appDir = await appDataDir();
      const dbPath = await join(appDir, 'kr1_memory.db');
      
      // Ensure directory exists
      const dirExists = await exists(appDir);
      if (!dirExists) {
        await createDir(appDir, { recursive: true });
      }

      // Connect to encrypted database
      this.db = await Database.load(`sqlite:${dbPath}`);
      
      // Enable encryption with PRAGMA key
      await this.db.execute(`PRAGMA key = '${this.encryptionKey}'`);
      
      // Create tables if they don't exist
      await this.createTables();
      
      // Start cleanup job for expired files
      this.startExpiryCleanup();
      
      this.isInitialized = true;
      console.log('Encrypted memory service initialized successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to initialize encrypted memory service:', error);
      throw error;
    }
  }

  /**
   * Generate or retrieve encryption key from secure storage
   */
  async getOrCreateEncryptionKey() {
    try {
      // Try to get existing key from Tauri secure storage
      let key;
      try {
        key = await invoke('get_encryption_key');
      } catch {
        // Generate new key if none exists
        key = this.generateEncryptionKey();
        await invoke('store_encryption_key', { key });
      }
      return key;
    } catch (error) {
      // Fallback: generate a session key (less secure but functional)
      console.warn('Using session encryption key - data will not persist between app restarts');
      return this.generateEncryptionKey();
    }
  }

  /**
   * Generate a secure encryption key
   */
  generateEncryptionKey() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Create database tables
   */
  async createTables() {
    // Conversations table for unlimited AI memory
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Folder paths table
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS folder_paths (
        id TEXT PRIMARY KEY,
        absolute_path TEXT UNIQUE NOT NULL,
        total_files INTEGER DEFAULT 0,
        last_accessed INTEGER,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Generated files table with expiry
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS generated_files (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        query_hash TEXT,
        expires_at INTEGER NOT NULL,
        file_type TEXT,
        size_bytes INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_folder_paths_path ON folder_paths(absolute_path)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_generated_files_expires ON generated_files(expires_at)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_generated_files_hash ON generated_files(query_hash)');
  }

  /**
   * Store conversation message in persistent memory
   */
  async storeConversation(sessionId, role, content, metadata = {}) {
    if (!this.isInitialized) await this.initialize();
    
    const id = uuidv4();
    const timestamp = Date.now();
    
    await this.db.execute(
      'INSERT INTO conversations (id, session_id, role, content, timestamp, metadata) VALUES (?, ?, ?, ?, ?, ?)',
      [id, sessionId, role, content, timestamp, JSON.stringify(metadata)]
    );
    
    return id;
  }

  /**
   * Load conversation history for a session
   */
  async loadConversationHistory(sessionId, limit = 1000) {
    if (!this.isInitialized) await this.initialize();
    
    const result = await this.db.select(
      'SELECT * FROM conversations WHERE session_id = ? ORDER BY timestamp ASC LIMIT ?',
      [sessionId, limit]
    );
    
    return result.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      role: row.role,
      content: row.content,
      timestamp: row.timestamp,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: row.created_at
    }));
  }

  /**
   * Load all conversation memory (for context)
   */
  async loadAllMemory(limit = 10000) {
    if (!this.isInitialized) await this.initialize();
    
    const result = await this.db.select(
      'SELECT * FROM conversations ORDER BY timestamp DESC LIMIT ?',
      [limit]
    );
    
    return result.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      role: row.role,
      content: row.content,
      timestamp: row.timestamp,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: row.created_at
    }));
  }

  /**
   * Search conversation memory
   */
  async searchMemory(query, limit = 100) {
    if (!this.isInitialized) await this.initialize();
    
    const result = await this.db.select(
      'SELECT * FROM conversations WHERE content LIKE ? ORDER BY timestamp DESC LIMIT ?',
      [`%${query}%`, limit]
    );
    
    return result.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      role: row.role,
      content: row.content,
      timestamp: row.timestamp,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: row.created_at
    }));
  }

  /**
   * Add folder path (deduplicated)
   */
  async addFolderPath(absolutePath, metadata = {}) {
    if (!this.isInitialized) await this.initialize();
    
    try {
      // Check if path already exists
      const existing = await this.db.select(
        'SELECT id FROM folder_paths WHERE absolute_path = ?',
        [absolutePath]
      );
      
      if (existing.length > 0) {
        // Update last accessed time
        await this.db.execute(
          'UPDATE folder_paths SET last_accessed = ?, metadata = ? WHERE absolute_path = ?',
          [Date.now(), JSON.stringify(metadata), absolutePath]
        );
        return existing[0].id;
      }
      
      // Add new path
      const id = uuidv4();
      await this.db.execute(
        'INSERT INTO folder_paths (id, absolute_path, last_accessed, metadata) VALUES (?, ?, ?, ?)',
        [id, absolutePath, Date.now(), JSON.stringify(metadata)]
      );
      
      return id;
    } catch (error) {
      console.error('Failed to add folder path:', error);
      throw error;
    }
  }

  /**
   * Get all folder paths
   */
  async getFolderPaths() {
    if (!this.isInitialized) await this.initialize();
    
    const result = await this.db.select(
      'SELECT * FROM folder_paths ORDER BY last_accessed DESC'
    );
    
    return result.map(row => ({
      id: row.id,
      absolutePath: row.absolute_path,
      totalFiles: row.total_files,
      lastAccessed: row.last_accessed,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: row.created_at
    }));
  }

  /**
   * Update folder file count
   */
  async updateFolderFileCount(absolutePath, fileCount) {
    if (!this.isInitialized) await this.initialize();
    
    await this.db.execute(
      'UPDATE folder_paths SET total_files = ?, last_accessed = ? WHERE absolute_path = ?',
      [fileCount, Date.now(), absolutePath]
    );
  }

  /**
   * Generate downloadable file with auto-expiry
   */
  async generateDownloadableFile(data, filename, queryHash = null, fileType = 'json') {
    if (!this.isInitialized) await this.initialize();
    
    try {
      // Check for duplicate based on query hash
      if (queryHash) {
        const existing = await this.db.select(
          'SELECT * FROM generated_files WHERE query_hash = ? AND expires_at > ?',
          [queryHash, Date.now()]
        );
        
        if (existing.length > 0) {
          return {
            id: existing[0].id,
            filePath: existing[0].file_path,
            filename: existing[0].filename,
            expiresAt: existing[0].expires_at,
            isDuplicate: true
          };
        }
      }
      
      // Create downloads directory
      const appDir = await appDataDir();
      const downloadsDir = await join(appDir, 'downloads');
      const dirExists = await exists(downloadsDir);
      if (!dirExists) {
        await createDir(downloadsDir, { recursive: true });
      }
      
      // Generate unique filename
      const timestamp = Date.now();
      const uniqueFilename = `${timestamp}_${filename}`;
      const filePath = await join(downloadsDir, uniqueFilename);
      
      // Write file content
      let content;
      switch (fileType.toLowerCase()) {
        case 'json':
          content = JSON.stringify(data, null, 2);
          break;
        case 'csv':
          content = this.convertToCSV(data);
          break;
        case 'txt':
        default:
          content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
          break;
      }
      
      await writeTextFile(filePath, content);
      
      // Calculate expiry time (2 hours from now)
      const expiresAt = Date.now() + (2 * 60 * 60 * 1000);
      
      // Store in database
      const id = uuidv4();
      await this.db.execute(
        'INSERT INTO generated_files (id, filename, file_path, query_hash, expires_at, file_type, size_bytes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, uniqueFilename, filePath, queryHash, expiresAt, fileType, content.length]
      );
      
      // Schedule deletion
      this.scheduleFileDeletion(id, filePath, expiresAt);
      
      return {
        id,
        filePath,
        filename: uniqueFilename,
        expiresAt,
        isDuplicate: false
      };
      
    } catch (error) {
      console.error('Failed to generate downloadable file:', error);
      throw error;
    }
  }

  /**
   * Convert data to CSV format
   */
  convertToCSV(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return 'No data available';
    }
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }

  /**
   * Schedule file deletion
   */
  scheduleFileDeletion(fileId, filePath, expiresAt) {
    const delay = expiresAt - Date.now();
    
    if (delay <= 0) {
      // File already expired, delete immediately
      this.deleteExpiredFile(fileId, filePath);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      this.deleteExpiredFile(fileId, filePath);
      this.expiryJobs.delete(fileId);
    }, delay);
    
    this.expiryJobs.set(fileId, timeoutId);
  }

  /**
   * Delete expired file
   */
  async deleteExpiredFile(fileId, filePath) {
    try {
      // Remove file from filesystem
      const fileExists = await exists(filePath);
      if (fileExists) {
        await removeFile(filePath);
      }
      
      // Remove from database
      await this.db.execute(
        'DELETE FROM generated_files WHERE id = ?',
        [fileId]
      );
      
      console.log(`Expired file deleted: ${filePath}`);
    } catch (error) {
      console.error('Failed to delete expired file:', error);
    }
  }

  /**
   * Start cleanup job for expired files
   */
  startExpiryCleanup() {
    // Run cleanup every 30 minutes
    setInterval(async () => {
      try {
        const now = Date.now();
        const expiredFiles = await this.db.select(
          'SELECT * FROM generated_files WHERE expires_at <= ?',
          [now]
        );
        
        for (const file of expiredFiles) {
          await this.deleteExpiredFile(file.id, file.file_path);
        }
        
        if (expiredFiles.length > 0) {
          console.log(`Cleaned up ${expiredFiles.length} expired files`);
        }
      } catch (error) {
        console.error('Cleanup job failed:', error);
      }
    }, 30 * 60 * 1000); // 30 minutes
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats() {
    if (!this.isInitialized) await this.initialize();
    
    const [conversationCount] = await this.db.select('SELECT COUNT(*) as count FROM conversations');
    const [folderCount] = await this.db.select('SELECT COUNT(*) as count FROM folder_paths');
    const [fileCount] = await this.db.select('SELECT COUNT(*) as count FROM generated_files WHERE expires_at > ?', [Date.now()]);
    
    return {
      totalConversations: conversationCount.count,
      totalFolderPaths: folderCount.count,
      activeGeneratedFiles: fileCount.count,
      isEncrypted: true,
      isOnlineOnly: true
    };
  }

  /**
   * Clear all memory (for testing/reset)
   */
  async clearAllMemory() {
    if (!this.isInitialized) await this.initialize();
    
    await this.db.execute('DELETE FROM conversations');
    await this.db.execute('DELETE FROM folder_paths');
    await this.db.execute('DELETE FROM generated_files');
    
    // Clear expiry jobs
    for (const timeoutId of this.expiryJobs.values()) {
      clearTimeout(timeoutId);
    }
    this.expiryJobs.clear();
    
    console.log('All memory cleared');
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
    
    // Clear expiry jobs
    for (const timeoutId of this.expiryJobs.values()) {
      clearTimeout(timeoutId);
    }
    this.expiryJobs.clear();
  }
}

// Export singleton instance
export const encryptedMemoryService = new EncryptedMemoryService();
export default encryptedMemoryService;