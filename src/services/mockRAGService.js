// Mock RAG Service for testing without Qdrant
import { v4 as uuidv4 } from 'uuid';

class MockRAGService {
  constructor() {
    this.isInitialized = false;
    this.documents = new Map(); // Store documents in memory
    this.embeddings = new Map(); // Store embeddings in memory
    this.collectionName = 'test_collection';
  }

  // Simple text embedding simulation (using character frequency)
  async embedText(text) {
    // Simulate embedding delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Create a simple embedding based on character frequencies
    const embedding = new Array(384).fill(0);
    const chars = text.toLowerCase();
    
    for (let i = 0; i < chars.length; i++) {
      const charCode = chars.charCodeAt(i);
      const index = charCode % 384;
      embedding[index] += 1;
    }
    
    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding;
  }

  // Calculate cosine similarity between two embeddings
  cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async initialize() {
    console.log('Initializing Mock RAG Service...');
    // Simulate initialization delay
    await new Promise(resolve => setTimeout(resolve, 500));
    this.isInitialized = true;
    console.log('Mock RAG Service initialized successfully');
    return { status: 'ok' };
  }

  async createCollection(collectionName) {
    if (!this.isInitialized) {
      throw new Error('RAG service not initialized');
    }
    
    console.log(`Creating mock collection: ${collectionName}`);
    this.collectionName = collectionName;
    return { status: 'ok' };
  }

  async addDocument(content, metadata = {}) {
    if (!this.isInitialized) {
      throw new Error('RAG service not initialized');
    }

    const id = uuidv4();
    const embedding = await this.embedText(content);
    
    const document = {
      id,
      content,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        length: content.length
      }
    };
    
    this.documents.set(id, document);
    this.embeddings.set(id, embedding);
    
    console.log(`Added document with ID: ${id}`);
    return { id, status: 'ok' };
  }

  async searchDocuments(query, limit = 5) {
    if (!this.isInitialized) {
      throw new Error('RAG service not initialized');
    }

    if (this.documents.size === 0) {
      return [];
    }

    const queryEmbedding = await this.embedText(query);
    const results = [];
    
    for (const [id, document] of this.documents) {
      const docEmbedding = this.embeddings.get(id);
      const score = this.cosineSimilarity(queryEmbedding, docEmbedding);
      
      results.push({
        id,
        score,
        payload: {
          content: document.content,
          ...document.metadata
        }
      });
    }
    
    // Sort by score (descending) and limit results
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  async deleteDocument(id) {
    if (!this.isInitialized) {
      throw new Error('RAG service not initialized');
    }

    const deleted = this.documents.delete(id) && this.embeddings.delete(id);
    console.log(`Document ${id} ${deleted ? 'deleted' : 'not found'}`);
    return { status: deleted ? 'ok' : 'not_found' };
  }

  async clearCollection() {
    if (!this.isInitialized) {
      throw new Error('RAG service not initialized');
    }

    this.documents.clear();
    this.embeddings.clear();
    console.log('Collection cleared');
    return { status: 'ok' };
  }

  async getCollectionInfo() {
    if (!this.isInitialized) {
      throw new Error('RAG service not initialized');
    }

    return {
      status: 'green',
      vectors_count: this.documents.size,
      indexed_vectors_count: this.documents.size,
      points_count: this.documents.size
    };
  }

  async getContext(query, maxTokens = 2000) {
    const results = await this.searchDocuments(query, 5);
    
    if (results.length === 0) {
      return '';
    }
    
    let context = 'Relevant context from knowledge base:\n\n';
    let tokenCount = context.length;
    
    for (const result of results) {
      const snippet = `[Score: ${result.score.toFixed(3)}] ${result.payload.title || 'Document'}: ${result.payload.content}\n\n`;
      
      if (tokenCount + snippet.length > maxTokens) {
        break;
      }
      
      context += snippet;
      tokenCount += snippet.length;
    }
    
    return context;
  }

  async processFile(file) {
    const content = await this.readFileContent(file);
    const metadata = {
      filename: file.name,
      type: file.type,
      size: file.size,
      source: 'file_upload'
    };
    
    return await this.addDocument(content, metadata);
  }

  async readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        resolve(event.target.result);
      };
      
      reader.onerror = (error) => {
        reject(new Error(`Failed to read file: ${error.message}`));
      };
      
      reader.readAsText(file);
    });
  }
}

// Create and export a singleton instance
const mockRAGService = new MockRAGService();
export default mockRAGService;