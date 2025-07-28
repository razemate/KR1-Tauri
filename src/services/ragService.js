import { QdrantClient } from '@qdrant/js-client-rest';
import { pipeline } from '@xenova/transformers';
import { v4 as uuidv4 } from 'uuid';
import mockRAGService from './mockRAGService.js';

class RAGService {
  constructor() {
    this.qdrantClient = null;
    this.embedder = null;
    this.collectionName = 'kr_documents';
    this.isInitialized = false;
    this.qdrantUrl = 'http://localhost:6333'; // Default Qdrant URL
    this.useMockService = false;
  }

  async initialize() {
    try {
      console.log('Initializing RAG Service...');
      
      // Try to initialize Qdrant client first
      try {
        this.qdrantClient = new QdrantClient({
          url: this.qdrantUrl,
        });

        // Test connection
        await this.qdrantClient.getCollections();
        console.log('✅ Qdrant connection established');

        // Initialize embedding model
        console.log('Loading embedding model...');
        this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        console.log('✅ Embedding model loaded');

        // Create collection if it doesn't exist
        await this.createCollection();
        
        this.isInitialized = true;
        this.useMockService = false;
        console.log('✅ RAG Service initialized successfully');
        return true;
      } catch (qdrantError) {
        console.warn('Qdrant not available, falling back to mock service:', qdrantError.message);
        
        // Fall back to mock service
        await mockRAGService.initialize();
        this.isInitialized = true;
        this.useMockService = true;
        
        console.log('✅ Mock RAG service initialized successfully');
        return true;
      }
    } catch (error) {
      console.error('❌ RAG Service initialization failed:', error);
      this.isInitialized = false;
      return false;
    }
  }

  async createCollection() {
    if (this.useMockService) {
      return await mockRAGService.createCollection();
    }

    try {
      const collections = await this.qdrantClient.getCollections();
      const collectionExists = collections.collections.some(
        col => col.name === this.collectionName
      );

      if (!collectionExists) {
        await this.qdrantClient.createCollection(this.collectionName, {
          vectors: {
            size: 384, // all-MiniLM-L6-v2 embedding size
            distance: 'Cosine'
          }
        });
        console.log(`✅ Collection '${this.collectionName}' created`);
      } else {
        console.log(`✅ Collection '${this.collectionName}' already exists`);
      }
    } catch (error) {
      console.error('❌ Error creating collection:', error);
      throw error;
    }
  }

  async embedText(text) {
    if (this.useMockService) {
      return await mockRAGService.embedText(text);
    }

    if (!this.embedder) {
      throw new Error('Embedder not initialized');
    }

    try {
      const output = await this.embedder(text, { pooling: 'mean', normalize: true });
      return Array.from(output.data);
    } catch (error) {
      console.error('❌ Error embedding text:', error);
      throw error;
    }
  }

  async addDocument(content, metadata = {}) {
    if (!this.isInitialized) {
      throw new Error('RAG Service not initialized');
    }

    if (this.useMockService) {
      return await mockRAGService.addDocument(content, metadata);
    }

    try {
      const id = uuidv4();
      const embedding = await this.embedText(content);
      
      const point = {
        id,
        vector: embedding,
        payload: {
          content,
          timestamp: new Date().toISOString(),
          ...metadata
        }
      };

      await this.qdrantClient.upsert(this.collectionName, {
        wait: true,
        points: [point]
      });

      console.log(`✅ Document added with ID: ${id}`);
      return id;
    } catch (error) {
      console.error('❌ Error adding document:', error);
      throw error;
    }
  }

  async searchSimilar(query, limit = 5, scoreThreshold = 0.7) {
    if (!this.isInitialized) {
      throw new Error('RAG Service not initialized');
    }

    if (this.useMockService) {
       return await mockRAGService.searchDocuments(query, limit);
     }

    try {
      const queryEmbedding = await this.embedText(query);
      
      const searchResult = await this.qdrantClient.search(this.collectionName, {
        vector: queryEmbedding,
        limit,
        score_threshold: scoreThreshold,
        with_payload: true
      });

      return searchResult.map(result => ({
        id: result.id,
        score: result.score,
        content: result.payload.content,
        metadata: {
          timestamp: result.payload.timestamp,
          ...Object.fromEntries(
            Object.entries(result.payload).filter(([key]) => key !== 'content')
          )
        }
      }));
    } catch (error) {
      console.error('❌ Error searching documents:', error);
      throw error;
    }
  }

  async deleteDocument(id) {
    if (!this.isInitialized) {
      throw new Error('RAG Service not initialized');
    }

    if (this.useMockService) {
      return await mockRAGService.deleteDocument(id);
    }

    try {
      await this.qdrantClient.delete(this.collectionName, {
        wait: true,
        points: [id]
      });
      console.log(`✅ Document deleted: ${id}`);
      return true;
    } catch (error) {
      console.error('❌ Error deleting document:', error);
      throw error;
    }
  }

  async clearCollection() {
    if (!this.isInitialized) {
      throw new Error('RAG Service not initialized');
    }

    if (this.useMockService) {
      return await mockRAGService.clearCollection();
    }

    try {
      await this.qdrantClient.delete(this.collectionName, {
        wait: true,
        filter: {} // Delete all points
      });
      console.log(`✅ Collection '${this.collectionName}' cleared`);
      return true;
    } catch (error) {
      console.error('❌ Error clearing collection:', error);
      throw error;
    }
  }

  async getCollectionInfo() {
    if (!this.isInitialized) {
      throw new Error('RAG Service not initialized');
    }

    if (this.useMockService) {
      return await mockRAGService.getCollectionInfo();
    }

    try {
      const info = await this.qdrantClient.getCollection(this.collectionName);
      return {
        name: this.collectionName,
        vectorsCount: info.vectors_count,
        indexedVectorsCount: info.indexed_vectors_count,
        pointsCount: info.points_count,
        status: info.status
      };
    } catch (error) {
      console.error('❌ Error getting collection info:', error);
      throw error;
    }
  }

  // Enhanced retrieval for chat context
  async retrieveContext(query, limit = 3) {
    if (this.useMockService) {
       return await mockRAGService.getContext(query, 2000);
     }

    const results = await this.searchSimilar(query, limit, 0.6);
    
    if (results.length === 0) {
      return '';
    }

    const context = results
      .map((result, index) => `[Context ${index + 1}] ${result.content}`)
      .join('\n\n');

    return context;
  }

  // Process uploaded files for RAG
  async processUploadedFiles(files) {
    if (this.useMockService) {
       const results = [];
       for (const file of files) {
         const result = await mockRAGService.processFile(file);
         results.push(result);
       }
       return results;
     }

    const processedFiles = [];
    
    for (const file of files) {
      try {
        let content = '';
        
        // Extract text content based on file type
        if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
          content = file.content;
        } else if (file.name.endsWith('.json')) {
          content = JSON.stringify(JSON.parse(file.content), null, 2);
        } else if (file.name.endsWith('.csv')) {
          content = file.content;
        } else {
          // For other file types, use filename and basic metadata
          content = `File: ${file.name} (${file.type}) - Size: ${file.size} bytes`;
        }

        const documentId = await this.addDocument(content, {
          filename: file.name,
          filetype: file.type,
          filesize: file.size,
          source: 'upload'
        });

        processedFiles.push({
          id: documentId,
          filename: file.name,
          status: 'processed'
        });
      } catch (error) {
        console.error(`❌ Error processing file ${file.name}:`, error);
        processedFiles.push({
          filename: file.name,
          status: 'error',
          error: error.message
        });
      }
    }

    return processedFiles;
  }
}

// Export singleton instance
export const ragService = new RAGService();
export default ragService;