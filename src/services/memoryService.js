import { load } from "@tauri-apps/plugin-sql";

let db;

/**
 * Initialize the SQLite database for memory and file storage
 */
export async function initMemoryDB() {
  try {
    db = await load("sqlite:kr1_memory.db");
    
    // Create memory table for conversation history and AI memory
    await db.execute(`
      CREATE TABLE IF NOT EXISTS memory (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        timestamp TEXT,
        tags TEXT
      );
    `);
    
    // Create files table for uploaded file storage
    await db.execute(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        filename TEXT,
        content BLOB,
        created_at TEXT
      );
    `);
    
    console.log('Memory database initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize memory database:', error);
    return false;
  }
}

/**
 * Save memory entry (conversation, notes, etc.)
 * @param {string} id - Unique identifier for the memory entry
 * @param {string} content - The content to store
 * @param {string} timestamp - ISO timestamp
 * @param {string} tags - Comma-separated tags for categorization
 */
export async function saveMemory(id, content, timestamp, tags = '') {
  try {
    await db.execute(
      "INSERT OR REPLACE INTO memory (id, content, timestamp, tags) VALUES (?, ?, ?, ?)",
      [id, content, timestamp, tags]
    );
    return true;
  } catch (error) {
    console.error('Failed to save memory:', error);
    return false;
  }
}

/**
 * Get all memory entries
 * @returns {Array} Array of memory objects
 */
export async function getAllMemory() {
  try {
    return await db.select("SELECT * FROM memory ORDER BY timestamp DESC");
  } catch (error) {
    console.error('Failed to get memory:', error);
    return [];
  }
}

/**
 * Search memory by content or tags
 * @param {string} query - Search query
 * @returns {Array} Array of matching memory objects
 */
export async function searchMemory(query) {
  try {
    return await db.select(
      "SELECT * FROM memory WHERE content LIKE ? OR tags LIKE ? ORDER BY timestamp DESC",
      [`%${query}%`, `%${query}%`]
    );
  } catch (error) {
    console.error('Failed to search memory:', error);
    return [];
  }
}

/**
 * Delete memory entry by ID
 * @param {string} id - Memory entry ID
 */
export async function deleteMemory(id) {
  try {
    await db.execute("DELETE FROM memory WHERE id = ?", [id]);
    return true;
  } catch (error) {
    console.error('Failed to delete memory:', error);
    return false;
  }
}

/**
 * Save uploaded file to local storage
 * @param {string} id - Unique file identifier
 * @param {string} filename - Original filename
 * @param {Blob|ArrayBuffer} content - File content
 * @param {string} createdAt - ISO timestamp
 */
export async function saveFile(id, filename, content, createdAt) {
  try {
    await db.execute(
      "INSERT OR REPLACE INTO files (id, filename, content, created_at) VALUES (?, ?, ?, ?)",
      [id, filename, content, createdAt]
    );
    return true;
  } catch (error) {
    console.error('Failed to save file:', error);
    return false;
  }
}

/**
 * Get all stored files
 * @returns {Array} Array of file objects
 */
export async function getAllFiles() {
  try {
    return await db.select("SELECT id, filename, created_at FROM files ORDER BY created_at DESC");
  } catch (error) {
    console.error('Failed to get files:', error);
    return [];
  }
}

/**
 * Get file content by ID
 * @param {string} id - File ID
 * @returns {Object|null} File object with content
 */
export async function getFile(id) {
  try {
    const result = await db.select("SELECT * FROM files WHERE id = ?", [id]);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to get file:', error);
    return null;
  }
}

/**
 * Delete file by ID
 * @param {string} id - File ID
 */
export async function deleteFile(id) {
  try {
    await db.execute("DELETE FROM files WHERE id = ?", [id]);
    return true;
  } catch (error) {
    console.error('Failed to delete file:', error);
    return false;
  }
}

/**
 * Get memory statistics
 * @returns {Object} Statistics about stored data
 */
export async function getMemoryStats() {
  try {
    const memoryCount = await db.select("SELECT COUNT(*) as count FROM memory");
    const filesCount = await db.select("SELECT COUNT(*) as count FROM files");
    
    return {
      memoryEntries: memoryCount[0]?.count || 0,
      storedFiles: filesCount[0]?.count || 0
    };
  } catch (error) {
    console.error('Failed to get memory stats:', error);
    return { memoryEntries: 0, storedFiles: 0 };
  }
}

/**
 * Clear old memory entries (keep last N entries)
 * @param {number} keepCount - Number of recent entries to keep
 */
export async function cleanupOldMemory(keepCount = 1000) {
  try {
    await db.execute(`
      DELETE FROM memory 
      WHERE id NOT IN (
        SELECT id FROM memory 
        ORDER BY timestamp DESC 
        LIMIT ?
      )
    `, [keepCount]);
    return true;
  } catch (error) {
    console.error('Failed to cleanup old memory:', error);
    return false;
  }
}

/**
 * Export all memory data as JSON
 * @returns {Object} Exported data
 */
export async function exportMemoryData() {
  try {
    const memory = await getAllMemory();
    const files = await getAllFiles();
    
    return {
      memory,
      files,
      exportedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to export memory data:', error);
    return null;
  }
}