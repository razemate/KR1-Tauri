import { create } from "zustand";
import ragService from '../services/ragService';

const DEFAULT_URL = "https://subscribers.katusaresearch.com";

// Check if we're in Tauri environment
const isTauri = typeof window !== 'undefined' && window.__TAURI_IPC__;

// Safely import Tauri API only if available
let invoke = null;
const initTauriApi = async () => {
  if (typeof window !== 'undefined' && window.__TAURI__) {
    try {
      const { invoke: tauriInvoke } = await import('@tauri-apps/api/tauri');
      invoke = tauriInvoke;
      console.log('Tauri API initialized successfully');
    } catch (error) {
      console.log('Failed to initialize Tauri API:', error);
      invoke = null;
    }
  } else {
    invoke = null;
    console.log('Running in browser mode - Tauri API not available');
  }
};

// Initialize immediately for browser environment
if (typeof window !== 'undefined' && !window.__TAURI__) {
  invoke = null;
}

const useStore = create((set, get) => ({
  messages: [],
  chatSessions: [],
  currentSessionId: null,
  apiKey: "",
  settings: {
    wooUrl: DEFAULT_URL,
    consumerKey: "",
    consumerSecret: "",
    googleAnalyticsApiKey: "",
    zendeskApiKey: "",
    zendeskDomain: "",
    zendeskEmail: "",
    zendeskApiToken: "",
    ontraportApiKey: "",
    ontraportAppId: "",
    merchantguyUrl: "https://secure.merchantguygateway.com/",
    merchantguyApiKey: ""
  },
  activeTab: "chat",
  wooData: null,
  status: "idle",
  uploadedFiles: [],
  isLoading: false,
  isCreatingSession: false,
  activeConnectedApps: new Set(),
  validatedApps: new Set(), // Track which apps have been successfully validated
  abortController: null,
  messageCache: new Map(),
  lastSaveTime: 0,
  
  // App Mode Management
  appMode: "universal", // "universal" or "query_processor"
  modeIndicator: {
    status: "active", // "active", "standby", "processing"
    color: "green" // "green", "yellow", "red"
  },
  
  // RAG Configuration
  ragConfig: {
    isInitialized: false,
    isInitializing: false,
    documentsCount: 0,
    lastError: null,
    qdrantUrl: 'http://localhost:6333'
  },
  
  // OpenRouter Configuration (Only LLM Provider)
  openRouterConfig: {
    apiKey: "",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    selectedModel: "qwen/qwen-2.5-coder-32b-instruct",
    isValidated: false,
    isConnected: false,
    availableModels: [
      { id: "qwen/qwen-2.5-coder-32b-instruct", name: "Qwen3 235B A22B 2507", provider: "Qwen" },
      { id: "google/gemini-2.0-flash-exp", name: "Gemini 2.0 Flash Experimental", provider: "Google" },
      { id: "deepseek/deepseek-chat", name: "Kimi Dev 72B", provider: "DeepSeek" },
      { id: "deepseek/deepseek-r1", name: "DeepSeek R1T2 Chimera", provider: "DeepSeek" },
      { id: "qwen/qwen-2.5-coder-7b-instruct", name: "Qwen3 Coder", provider: "Qwen" },
      { id: "mistralai/mistral-small", name: "Mistral Small 3.2 24B", provider: "Mistral" },
      { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B Instruct", provider: "Meta" },
      { id: "qwen/qwen2-vl-72b-instruct", name: "Qwen2.5 VL 72B Instruct", provider: "Qwen" },
      { id: "deepseek/deepseek-r1-distill-llama-70b", name: "DeepSeek R1 0528", provider: "DeepSeek" },
      { id: "reka/reka-flash", name: "Reka Flash 3", provider: "Reka" }
    ]
  },

  // Load pre-installed credentials from .env.prod
  loadPreInstalledCredentials: async () => {
    try {
      if (invoke) {
        // Try to load pre-installed credentials from .env.prod via Tauri
        const preInstalledCreds = await invoke("load_env_credentials");
        if (preInstalledCreds) {
          set({
            settings: {
              ...get().settings,
              wooUrl: preInstalledCreds.woo_base_url || DEFAULT_URL,
              consumerKey: preInstalledCreds.woo_key || "",
              consumerSecret: preInstalledCreds.woo_secret || "",
              merchantguyUrl: preInstalledCreds.merchantguy_base_url || "https://secure.merchantguygateway.com/",
              merchantguyApiKey: preInstalledCreds.merchantguy_key || ""
            }
          });
          console.log('Pre-installed credentials loaded successfully from Tauri');
          return true;
        }
      } else {
        // Fallback for browser development mode - use hardcoded values from .env.prod
        const preInstalledCreds = {
          woo_base_url: "https://subscribers.katusaresearch.com",
          woo_key: "ck_5bfc9d3660527a1938b6d6aedea4a683fac3ae77",
          woo_secret: "cs_741088df54d1688e002e7048e15fe82e35c01557",
          merchantguy_base_url: "https://secure.merchantguygateway.com/api/transact.php",
          merchantguy_key: "aSk77747CqDyvX834gM34jPy5arj327r"
        };
        
        set({
          settings: {
            ...get().settings,
            wooUrl: preInstalledCreds.woo_base_url,
            consumerKey: preInstalledCreds.woo_key,
            consumerSecret: preInstalledCreds.woo_secret,
            merchantguyUrl: preInstalledCreds.merchantguy_base_url,
            merchantguyApiKey: preInstalledCreds.merchantguy_key
          }
        });
        console.log('Pre-installed credentials loaded successfully from fallback');
        return true;
      }
    } catch (error) {
      console.log('No pre-installed credentials found or error loading:', error);
    }
    return false;
  },

  init: async () => {
    try {
      // Initialize Tauri API first
      await initTauriApi();
      
      // First, try to load pre-installed credentials
      await get().loadPreInstalledCredentials();
      
      if (invoke) {
        const hasConfig = await invoke("file_exists");
        if (hasConfig) {
          const credentials = await invoke("read_encrypted_file");
          // Only override pre-installed credentials if user has saved custom ones
          set({
            settings: {
              ...get().settings,
              wooUrl: credentials.woo_url || get().settings.wooUrl,
              consumerKey: credentials.consumer_key || get().settings.consumerKey,
              consumerSecret: credentials.consumer_secret || get().settings.consumerSecret,
              googleAnalyticsApiKey: credentials.google_analytics_api_key || "",
              zendeskApiKey: credentials.zendesk_api_key || "",
              zendeskDomain: credentials.zendesk_domain || "",
              zendeskEmail: credentials.zendesk_email || "",
              zendeskApiToken: credentials.zendesk_api_token || "",
              ontraportApiKey: credentials.ontraport_api_key || "",
              ontraportAppId: credentials.ontraport_app_id || "",
              merchantguyUrl: credentials.merchantguy_url || get().settings.merchantguyUrl,
              merchantguyApiKey: credentials.merchantguy_api_key || get().settings.merchantguyApiKey
            }
          });
        }
        
        // Load chat sessions from Tauri storage
        try {
          const savedSessions = await invoke("get_chat_sessions");
          if (savedSessions && Array.isArray(savedSessions)) {
            set({ chatSessions: savedSessions });
          }
        } catch (sessionError) {
          console.log('No saved sessions found');
        }
      } else {
        // Fallback for browser environment
        const stored = localStorage.getItem('kr1-settings');
        if (stored) {
          const savedSettings = JSON.parse(stored);
          set({
            settings: {
              ...get().settings,
              ...savedSettings,
              merchantguyUrl: savedSettings.merchantguyUrl || "https://secure.merchantguygateway.com/",
              merchantguyApiKey: savedSettings.merchantguyApiKey || ""
            }
          });
        }
        
        // Load chat sessions from localStorage
        const savedSessions = localStorage.getItem('chat_sessions');
        if (savedSessions) {
          try {
            const parsedSessions = JSON.parse(savedSessions);
            if (Array.isArray(parsedSessions)) {
              set({ chatSessions: parsedSessions });
            }
          } catch (error) {
            console.error('Failed to parse saved sessions:', error);
          }
        }
      }
      
      // Load API keys
      await get().loadApiKeys();
      
      // Initialize RAG if configured
      const { ragConfig } = get();
      if (ragConfig.isInitialized) {
        try {
          await get().initializeRAG();
        } catch (error) {
          console.log('RAG initialization skipped:', error.message);
        }
      }
      
      // Performance optimization: Clean up old cache entries
      const { messageCache } = get();
      if (messageCache.size > 50) {
        const entries = Array.from(messageCache.entries());
        const keepEntries = entries.slice(-25); // Keep last 25 entries
        messageCache.clear();
        keepEntries.forEach(([key, value]) => messageCache.set(key, value));
      }
      
      // Load persisted connected apps state
      let persistedConnectedApps = new Set();
      try {
        if (invoke) {
          // Try to load from Tauri storage
          const savedConnectedApps = await invoke("get_connected_apps").catch(() => null);
          if (savedConnectedApps && Array.isArray(savedConnectedApps)) {
            persistedConnectedApps = new Set(savedConnectedApps);
          }
        } else {
          // Load from localStorage for browser
          const savedApps = localStorage.getItem('connected_apps');
          if (savedApps) {
            const parsedApps = JSON.parse(savedApps);
            if (Array.isArray(parsedApps)) {
              persistedConnectedApps = new Set(parsedApps);
            }
          }
        }
      } catch (error) {
        console.log('No persisted connected apps found:', error);
      }

      // Load persisted validated apps state
      let persistedValidatedApps = new Set();
      try {
        if (invoke) {
          // Try to load from Tauri storage
          const savedValidatedApps = await invoke("get_validated_apps").catch(() => null);
          if (savedValidatedApps && Array.isArray(savedValidatedApps)) {
            persistedValidatedApps = new Set(savedValidatedApps);
          }
        } else {
          // Load from localStorage for browser
          const savedValidatedApps = localStorage.getItem('validated_apps');
          if (savedValidatedApps) {
            const parsedValidatedApps = JSON.parse(savedValidatedApps);
            if (Array.isArray(parsedValidatedApps)) {
              persistedValidatedApps = new Set(parsedValidatedApps);
            }
          }
        }
      } catch (error) {
        console.log('No persisted validated apps found:', error);
      }
      
      // Auto-connect apps with valid credentials
      const { settings } = get();
      const newActiveApps = new Set(persistedConnectedApps);
      
      // Auto-connect WooCommerce if credentials are available
      if (settings.wooUrl && settings.consumerKey && settings.consumerSecret) {
        newActiveApps.add('woocommerce');
      }
      
      // Auto-connect MerchantGuy if credentials are available (for persistence)
      if (settings.merchantguyApiKey && settings.merchantguyUrl) {
        newActiveApps.add('merchantguy');
      }
      
      // Update activeConnectedApps and validatedApps
      set({ 
        activeConnectedApps: newActiveApps,
        validatedApps: persistedValidatedApps
      });
      
      // Save the updated connected apps state
      get().saveConnectedAppsState();
      
      // Initialize app mode based on connected apps
      get().updateAppMode();
    } catch (error) {
      console.error("Credential load error:", error);
    }
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  setIsCreatingSession: (isCreating) => {
    set({ isCreatingSession: isCreating });
  },

  setOpenRouterApiKey: (apiKey) => {
    set((state) => ({
      openRouterConfig: {
        ...state.openRouterConfig,
        apiKey
      }
    }));
  },

  setSelectedModel: (modelId) => {
    set((state) => ({
      openRouterConfig: {
        ...state.openRouterConfig,
        selectedModel: modelId
      }
    }));
  },

  addMessage: (message) => {
    set((state) => {
      const newMessages = [...state.messages, message];
      
      // Update current session if exists
      if (state.currentSessionId) {
        const updatedSessions = state.chatSessions.map(session => 
          session.id === state.currentSessionId 
            ? { ...session, messages: newMessages, lastUpdated: new Date().toISOString() }
            : session
        );
        
        // Debounced save to storage (save every 5 messages or after 30 seconds)
        const shouldSave = newMessages.length % 5 === 0 || 
          (Date.now() - (state.lastSaveTime || 0)) > 30000;
        
        if (shouldSave) {
          if (invoke) {
            invoke("save_chat_sessions", { sessions: updatedSessions }).catch(console.error);
          } else {
            localStorage.setItem('chat_sessions', JSON.stringify(updatedSessions));
          }
        }
        
        return {
          messages: newMessages,
          chatSessions: updatedSessions,
          lastSaveTime: shouldSave ? Date.now() : state.lastSaveTime
        };
      }
      
      return { messages: newMessages };
    });
  },

  // Chat Session Management
  createNewSession: () => {
    const sessionId = `session_${Date.now()}`;
    const newSession = {
      id: sessionId,
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    set((state) => {
      // Performance optimization: Limit session history to 50 sessions
      const updatedSessions = [newSession, ...state.chatSessions.slice(0, 49)];
      
      // Save sessions to storage
      if (invoke) {
        invoke("save_chat_sessions", { sessions: updatedSessions }).catch(console.error);
      } else {
        localStorage.setItem('chat_sessions', JSON.stringify(updatedSessions));
      }
      
      return {
        chatSessions: updatedSessions,
        currentSessionId: sessionId,
        messages: []
      };
    });
    
    return sessionId;
  },

  loadSession: (sessionId) => {
    const { chatSessions } = get();
    const session = chatSessions.find(s => s.id === sessionId);
    
    if (session) {
      set({
        currentSessionId: sessionId,
        messages: session.messages || []
      });
    }
  },

  updateSessionTitle: (sessionId, title) => {
    set((state) => {
      const updatedSessions = state.chatSessions.map(session => 
        session.id === sessionId 
          ? { ...session, title, lastUpdated: new Date().toISOString() }
          : session
      );
      
      // Save sessions to storage
      if (invoke) {
        invoke("save_chat_sessions", { sessions: updatedSessions }).catch(console.error);
      } else {
        localStorage.setItem('chat_sessions', JSON.stringify(updatedSessions));
      }
      
      return { chatSessions: updatedSessions };
    });
  },

  deleteSession: (sessionId) => {
    set((state) => {
      const updatedSessions = state.chatSessions.filter(s => s.id !== sessionId);
      const newCurrentSessionId = state.currentSessionId === sessionId 
        ? (updatedSessions.length > 0 ? updatedSessions[0].id : null)
        : state.currentSessionId;
      
      // Save sessions to storage
      if (invoke) {
        invoke("save_chat_sessions", { sessions: updatedSessions }).catch(console.error);
      } else {
        localStorage.setItem('chat_sessions', JSON.stringify(updatedSessions));
      }
      
      return {
        chatSessions: updatedSessions,
        currentSessionId: newCurrentSessionId,
        messages: newCurrentSessionId 
          ? updatedSessions.find(s => s.id === newCurrentSessionId)?.messages || []
          : []
      };
    });
  },

  getChatSessions: () => {
    return get().chatSessions;
  },

  addUploadedFile: (file) => {
    set((state) => ({
      uploadedFiles: [...state.uploadedFiles, file]
    }));
  },

  clearUploadedFiles: () => {
    set({ uploadedFiles: [] });
  },

  processFileContent: async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target.result;
        const fileData = {
          name: file.name,
          type: file.type,
          size: file.size,
          content: content,
          timestamp: new Date().toISOString()
        };
        resolve(fileData);
      };
      
      reader.onerror = (e) => {
        reject(new Error(`Failed to read file: ${file.name}`));
      };
      
      // Read file as text for most file types
      if (file.type.includes('text') || file.name.endsWith('.csv') || file.name.endsWith('.json')) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  },

  sendMessage: async (message) => {
    const { addMessage, sendLLMRequest, processConnectedAppMessage, uploadedFiles, clearUploadedFiles, activeConnectedApps, getRAGContext, processFilesForRAG, currentSessionId, messageCache } = get();
    
    // Ensure we have a session
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = get().createNewSession();
    }
    
    // Set loading state and create abort controller
    const abortController = new AbortController();
    set({ isLoading: true, abortController });
    
    // Add user message with file attachments if any
    const userMessage = {
      id: Date.now(),
      content: message,
      role: 'user',
      timestamp: new Date().toISOString(),
      attachments: uploadedFiles.length > 0 ? [...uploadedFiles] : undefined
    };
    addMessage(userMessage);
    
    // Update session title based on first message
    const { chatSessions } = get();
    const currentSession = chatSessions.find(s => s.id === sessionId);
    if (currentSession && currentSession.messages.length <= 1) {
      const title = message.length > 50 ? message.substring(0, 50) + '...' : message;
      get().updateSessionTitle(sessionId, title);
    }
    
    try {
      // Process uploaded files for RAG if RAG is initialized
      if (uploadedFiles.length > 0) {
        try {
          await processFilesForRAG(uploadedFiles);
          console.log('✅ Files processed for RAG');
        } catch (ragError) {
          console.warn('⚠️ RAG file processing failed:', ragError.message);
        }
      }
      
      // Get RAG context for the message
      let ragContext = '';
      try {
        ragContext = await getRAGContext(message);
        if (ragContext) {
          console.log('✅ RAG context retrieved');
        }
      } catch (ragError) {
        console.warn('⚠️ RAG context retrieval failed:', ragError.message);
      }
      
      // Process connected apps and enhance the message with context
      let enhancedMessage = await processConnectedAppMessage(message, activeConnectedApps);
      
      // Add RAG context if available
      if (ragContext) {
        enhancedMessage = `${enhancedMessage}\n\nRelevant Context from Knowledge Base:\n${ragContext}`;
      }
      
      // Add file context if files are uploaded
      if (uploadedFiles.length > 0) {
        const fileContext = uploadedFiles.map(file => 
          `File: ${file.name} (${file.type})\nContent: ${file.content}`
        ).join('\n\n');
        
        enhancedMessage = `${enhancedMessage}\n\nAttached Files Context:\n${fileContext}`;
      }
      
      // Check cache for similar queries
      const cacheKey = `${enhancedMessage}`.substring(0, 100);
      if (messageCache.has(cacheKey)) {
        const cachedResponse = messageCache.get(cacheKey);
        const aiMessage = {
          id: Date.now() + 1,
          content: cachedResponse,
          role: 'assistant',
          timestamp: new Date().toISOString()
        };
        addMessage(aiMessage);
        clearUploadedFiles();
        set({ isLoading: false, abortController: null });
        return cachedResponse;
      }
      
      // Get conversation history for context (last 10 messages)
      const { messages } = get();
      const recentMessages = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Send to OpenRouter LLM with abort signal and conversation context
      const response = await sendLLMRequest(enhancedMessage, abortController.signal, recentMessages);
      
      // Cache the response
      messageCache.set(cacheKey, response);
      if (messageCache.size > 100) { // Limit cache size
        const firstKey = messageCache.keys().next().value;
        messageCache.delete(firstKey);
      }
      
      // Add AI response
      const aiMessage = {
        id: Date.now() + 1,
        content: response,
        role: 'assistant',
        timestamp: new Date().toISOString()
      };
      addMessage(aiMessage);
      
      // Clear uploaded files after sending
      clearUploadedFiles();
      
      // Clear loading state
      set({ isLoading: false, abortController: null });
      
      return response;
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Handle abort error differently
      if (error.name === 'AbortError') {
        const abortMessage = {
          id: Date.now() + 1,
          content: 'Message generation was stopped.',
          role: 'system',
          timestamp: new Date().toISOString(),
          isError: false
        };
        addMessage(abortMessage);
      } else {
        // Add error message
        const errorMessage = {
          id: Date.now() + 1,
          content: `Error: ${error.message}`,
          role: 'system',
          timestamp: new Date().toISOString(),
          isError: true
        };
        addMessage(errorMessage);
      }
      
      // Clear loading state on error
      set({ isLoading: false, abortController: null });
      
      throw error;
    }
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  // Connected Apps Management
  toggleConnectedApp: (appKey) => {
    set((state) => {
      const isActive = state.activeConnectedApps.has(appKey);
      const newActiveApps = new Set(state.activeConnectedApps);
      if (isActive) {
        newActiveApps.delete(appKey);
      } else {
        newActiveApps.add(appKey);
      }
      return {
        activeConnectedApps: newActiveApps
      };
    });
    // Save the updated connected apps state
    get().saveConnectedAppsState();
    // Automatically update app mode after toggling
    get().updateAppMode();
  },

  // Save connected apps state to storage
  saveConnectedAppsState: async () => {
    const { activeConnectedApps } = get();
    const appsArray = Array.from(activeConnectedApps);
    
    try {
      if (invoke) {
        // Save to Tauri storage
        await invoke("save_connected_apps", { apps: appsArray });
      } else {
        // Save to localStorage for browser
        localStorage.setItem('connected_apps', JSON.stringify(appsArray));
      }
    } catch (error) {
      console.error('Failed to save connected apps state:', error);
    }
  },

  isAppActive: (appKey) => {
    return get().activeConnectedApps.has(appKey);
  },

  // Validated Apps Management
  addValidatedApp: (appKey) => {
    set((state) => {
      const newValidatedApps = new Set(state.validatedApps);
      newValidatedApps.add(appKey);
      return {
        validatedApps: newValidatedApps
      };
    });
    get().saveValidatedAppsState();
  },

  removeValidatedApp: (appKey) => {
    set((state) => {
      const newValidatedApps = new Set(state.validatedApps);
      newValidatedApps.delete(appKey);
      return {
        validatedApps: newValidatedApps
      };
    });
    get().saveValidatedAppsState();
  },

  isAppValidated: (appKey) => {
    return get().validatedApps.has(appKey);
  },

  // Save validated apps state to storage
  saveValidatedAppsState: async () => {
    const { validatedApps } = get();
    const appsArray = Array.from(validatedApps);
    
    try {
      if (invoke) {
        // Save to Tauri storage
        await invoke("save_validated_apps", { apps: appsArray });
      } else {
        // Save to localStorage for browser
        localStorage.setItem('validated_apps', JSON.stringify(appsArray));
      }
    } catch (error) {
      console.error('Failed to save validated apps state:', error);
    }
  },

  // App Mode Management - automatically updates based on connected apps
  updateAppMode: () => {
    const { activeConnectedApps } = get();
    const hasConnectedApps = activeConnectedApps.size > 0;
    const mode = hasConnectedApps ? "query_processor" : "universal";
    const color = hasConnectedApps ? "yellow" : "green";
    
    set((state) => ({
      appMode: mode,
      modeIndicator: {
        status: hasConnectedApps ? "standby" : "active",
        color: color
      }
    }));
  },

  // File Download Functionality
  generateDownloadableFile: (content, filename, type = 'text/plain') => {
    try {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('Error generating downloadable file:', error);
      return false;
    }
  },

  // Enhanced message processing with connected app integration
  processConnectedAppMessage: async (message, activeApps) => {
    const { settings } = get();
    let enhancedMessage = message;
    let appData = {};

    // Process each active connected app
    for (const appKey of activeApps) {
      try {
        switch (appKey) {
          case 'woocommerce':
            if (settings.consumerKey && settings.consumerSecret) {
              console.log('Processing WooCommerce data for message:', message);
              const wooData = await get().getWooCommerceData(message);
              console.log('WooCommerce data received:', {
                hasData: !!wooData,
                dataType: typeof wooData,
                isArray: Array.isArray(wooData),
                length: Array.isArray(wooData) ? wooData.length : 'N/A',
                data: wooData
              });
              if (wooData) {
                appData.woocommerce = wooData;
              }
            }
            break;
          case 'googleanalytics':
            if (settings.googleAnalyticsApiKey) {
              // Placeholder for Google Analytics integration
              appData.googleanalytics = { message: 'Google Analytics integration active' };
            }
            break;
          case 'zendesk':
            if (settings.zendeskApiKey && settings.zendeskDomain) {
              // Placeholder for Zendesk integration
              appData.zendesk = { message: 'Zendesk integration active' };
            }
            break;
          case 'ontraport':
            if (settings.ontraportApiKey && settings.ontraportAppId) {
              const ontraportData = await get().getOntraportData(message);
              if (ontraportData) {
                appData.ontraport = ontraportData;
              }
            }
            break;
          case 'merchantguy':
            if (settings.merchantguyApiKey && settings.merchantguyUrl) {
              const merchantguyData = await get().getMerchantguyData(message);
              if (merchantguyData) {
                appData.merchantguy = merchantguyData;
              }
            }
            break;
          case 'zendesk':
            if (settings.zendeskApiKey && settings.zendeskDomain) {
              const zendeskData = await get().getZendeskData(message);
              if (zendeskData) {
                appData.zendesk = zendeskData;
              }
            }
            break;
        }
      } catch (error) {
        console.warn(`Error processing ${appKey}:`, error);
      }
    }

    // Enhance message with app data if available
    if (Object.keys(appData).length > 0) {
      enhancedMessage = `${message}\n\nConnected App Data:\n${JSON.stringify(appData, null, 2)}`;
      console.log('Enhanced message with app data:', {
        originalMessage: message,
        appDataKeys: Object.keys(appData),
        appDataSize: JSON.stringify(appData).length,
        enhancedMessagePreview: enhancedMessage.substring(0, 500) + '...'
      });
    } else {
      console.log('No app data found for message:', message);
    }

    return enhancedMessage;
  },

  sendLLMRequest: async (message, abortSignal = null, conversationHistory = []) => {
    const { openRouterConfig } = get();
    
    if (!openRouterConfig.apiKey) {
      throw new Error('OpenRouter API key is required. Please configure it in settings.');
    }
    
    try {
      // Build messages array with conversation history
      const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().toLocaleString('default', { month: 'long' });
      
      const messages = [
        {
          role: 'system',
          content: `You are KR1, an AI assistant specialized in data retrieval and analysis from connected applications. Your primary purpose is to act as a query translator and data processor for integrated business applications.

**CURRENT DATE CONTEXT:** Today is ${currentDate} (${currentMonth} ${currentYear}). Always use this as your reference for current date and time when processing user requests. For queries about future dates, note that no data exists yet and respond accordingly without samples.

**CORE DIRECTIVE:** When one or more apps are connected (WooCommerce, Google Analytics, Zendesk, Ontraport, Merchantguygateway), you MUST use the actual data provided in the 'Connected App Data' section of the user message to formulate your response. Never generate sample, mock, or illustrative data. If no relevant data is provided or available, clearly state that no data matches the query.

**Key Capabilities:**
1. **Direct Data Access**: Use the provided app data to respond with real information.
2. **Query Translation**: Convert natural language requests into specific data retrieval operations using the given data.
3. **Data Analysis**: Process and analyze the provided data to provide insights and reports.
4. **File Generation**: Create downloadable reports in CSV, JSON, Excel, or other formats using real data only.
5. **Cross-Platform Integration**: Combine data from multiple connected sources when relevant, using provided data.
6. **RAG-Enhanced Responses**: Use knowledge base context for more accurate information.

**Data Retrieval Protocol:**
- For WooCommerce: Use provided orders, customers, products, subscriptions, and sales data.
- For Google Analytics: Use provided website traffic, user behavior, and conversion metrics.
- For Zendesk: Use provided support tickets, customer interactions, and service metrics.
- For Ontraport: Use provided contacts, campaigns, transactions, and marketing data.
- For Merchantguygateway: Use provided transaction history and reporting data.

**CRITICAL INSTRUCTIONS:**
- NEVER generate downloadable files or use download code blocks unless explicitly requested by the user
- NEVER create sample data, mock data, or placeholder content
- Always base responses on the actual 'Connected App Data' provided
- Never ask for permission to access data
- If data is unavailable (e.g., for future dates), state 'No data available for the specified criteria.'
- Provide comprehensive, actionable responses using real data only
- Only generate files when the user specifically asks for a file download`
        }
      ];
      
      // Add conversation history (excluding system messages to avoid duplication)
      if (conversationHistory && conversationHistory.length > 0) {
        const filteredHistory = conversationHistory.filter(msg => msg.role !== 'system');
        messages.push(...filteredHistory.slice(-8)); // Last 8 messages for context
      }
      
      // Add current message
      messages.push({
        role: 'user',
        content: message
      });
      
      const fetchOptions = {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterConfig.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'KR1'
        },
        body: JSON.stringify({
          model: openRouterConfig.selectedModel,
          messages: messages,
          max_tokens: 2000,
          temperature: 0.7,
          stream: false
        })
      };
      
      // Add abort signal if provided
      if (abortSignal) {
        fetchOptions.signal = abortSignal;
      }
      
      const response = await fetch(openRouterConfig.endpoint, fetchOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API Error (${response.status}): ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from OpenRouter API');
      }
      
      return data.choices[0].message.content;
    } catch (error) {
      console.error('OpenRouter API error:', error);
      throw error;
    }
  },
  
  processWooCommerceCommand: async (message) => {
    const { settings, getWooCommerceData } = get();
    
    // Check if message contains WooCommerce-related keywords
    const wooKeywords = [
      'subscription', 'order', 'customer', 'product', 'sales', 'revenue',
      'report', 'analytics', 'transaction', 'refund', 'inventory', 'stock'
    ];
    
    const containsWooKeyword = wooKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
    
    if (containsWooKeyword && settings.consumerKey && settings.consumerSecret) {
      try {
        // Fetch relevant WooCommerce data based on the query
        const wooData = await getWooCommerceData(message);
        
        if (wooData) {
          return `${message}\n\nWooCommerce Context: ${JSON.stringify(wooData, null, 2)}`;
        }
      } catch (error) {
        console.warn('Failed to fetch WooCommerce data:', error);
      }
    }
    
    return message;
  },
  
  getWooCommerceData: async (query) => {
    const { settings } = get();
    
    if (!settings.wooUrl || !settings.consumerKey || !settings.consumerSecret) {
      throw new Error('WooCommerce credentials not configured');
    }
    
    try {
      // Import the secure WooCommerce service
      const { wooCommerceService } = await import('../services/dataService.js');
      
      // Determine what data to fetch and build query parameters
      const lowerQuery = query.toLowerCase();
      let params = { per_page: 100 }; // Increase limit to get more data
      
      console.log('WooCommerce API Request:', {
        url: settings.wooUrl,
        query: lowerQuery,
        params
      });
      
      // Extract date information from query
      const monthMatch = query.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\b/i);
      if (monthMatch) {
        const monthName = monthMatch[1].toLowerCase();
        const year = monthMatch[2];
        const monthNumber = {
          'january': '01', 'february': '02', 'march': '03', 'april': '04',
          'may': '05', 'june': '06', 'july': '07', 'august': '08',
          'september': '09', 'october': '10', 'november': '11', 'december': '12'
        }[monthName];
        
        if (monthNumber) {
          // Set date range for the specific month
          params.after = `${year}-${monthNumber}-01T00:00:00`;
          params.before = `${year}-${monthNumber}-${new Date(year, parseInt(monthNumber), 0).getDate()}T23:59:59`;
        }
      }
      
      // Prepare credentials object
       const credentials = {
         wooUrl: settings.wooUrl,
         consumerKey: settings.consumerKey,
         consumerSecret: settings.consumerSecret
       };
       
       // Determine endpoint based on query content
       let result;
       if (lowerQuery.includes('subscription')) {
         // For subscriptions, try to get orders with subscription products
         params.meta_key = '_subscription_renewal';
         result = await wooCommerceService.getOrders(params, credentials);
       } else if (lowerQuery.includes('order') || lowerQuery.includes('transaction') || lowerQuery.includes('email')) {
         result = await wooCommerceService.getOrders(params, credentials);
       } else if (lowerQuery.includes('customer')) {
         result = await wooCommerceService.getCustomers(params, credentials);
       } else if (lowerQuery.includes('product')) {
         result = await wooCommerceService.getProducts(params, credentials);
       } else {
         // Default to orders for general queries
         result = await wooCommerceService.getOrders(params, credentials);
       }
       
       console.log('WooCommerce API Response:', {
         dataLength: Array.isArray(result) ? result.length : 'Not an array',
         dataType: typeof result,
         firstItem: Array.isArray(result) && result.length > 0 ? result[0] : 'No data',
         result: result
       });
       
       return result;
    } catch (error) {
      console.error('WooCommerce API error:', error);
      throw error;
    }
  },

  getOntraportData: async (query) => {
    const { settings } = get();
    
    if (!settings.ontraportApiKey || !settings.ontraportAppId) {
      throw new Error('Ontraport credentials not configured');
    }
    
    try {
      let endpoint = '';
      const lowerQuery = query.toLowerCase();
      
      if (lowerQuery.includes('product')) {
        endpoint = '/1/objects?objectID=16&range=50'; // Products
      } else if (lowerQuery.includes('transaction')) {
        endpoint = '/1/objects?objectID=46&range=50'; // Transactions
      } else if (lowerQuery.includes('purchase')) {
        endpoint = '/1/objects?objectID=46&range=50'; // Transactions/Purchases
      } else if (lowerQuery.includes('tag')) {
        endpoint = '/1/objects?objectID=14&range=50'; // Tags
      } else {
        endpoint = '/1/objects?objectID=0&range=50'; // Contacts
      }
      
      const response = await fetch(`https://api.ontraport.com${endpoint}`, {
        headers: {
          'Api-Key': settings.ontraportApiKey,
          'Api-Appid': settings.ontraportAppId,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Ontraport API Error: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        data: data.data || [],
        total: data.count || 0,
        fields: data.listFields || {}
      };
    } catch (error) {
      console.error('Ontraport API error:', error);
      throw error;
    }
  },

  getMerchantguyData: async (query) => {
    const { settings } = get();
    
    if (!settings.merchantguyApiKey || !settings.merchantguyUrl) {
      throw new Error('Merchantguy credentials not configured');
    }
    
    try {
      // Query recent transactions using Merchantguy's query methodology
      console.log('Using Merchantguy URL:', settings.merchantguyUrl);
      const response = await fetch(settings.merchantguyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          security_key: settings.merchantguyApiKey,
          report_type: 'transaction_search',
          start_date: '1970-01-01', // Retrieve all data since beginning of time
          end_date: new Date().toISOString().split('T')[0],
          transaction_type: 'sale'
        })
      });
      
      if (!response.ok) {
        throw new Error(`Merchantguy API Error: ${response.status}`);
      }
      
      const data = await response.text();
      // Parse the response which comes in query string format
      const params = new URLSearchParams(data);
      const transactions = [];
      
      // Extract transaction data from the response
      if (params.get('response') === '1') {
        const transactionData = params.get('transaction_data') || '';
        // Process transaction data if available
        transactions.push({
          status: 'success',
          data: transactionData
        });
      }
      
      return {
        transactions,
        total: transactions.length,
        status: params.get('response') === '1' ? 'success' : 'error'
      };
    } catch (error) {
      console.error('Merchantguy API error:', error);
      throw error;
    }
  },


  updateSettings: (newSettings) => {
    set((state) => ({
      settings: {
        ...state.settings,
        ...newSettings,
        merchantguyUrl: newSettings.merchantguyUrl || state.settings.merchantguyUrl || "https://secure.merchantguygateway.com"
      }
    }));
  },

  saveAllSettings: async () => {
    const { settings } = get();
    try {
      if (invoke) {
        await invoke("write_encrypted_file", { contents: JSON.stringify(settings) });
      } else {
        localStorage.setItem('kr1-settings', JSON.stringify(settings));
      }
      set({ status: "saved" });
      return true;
    } catch (error) {
      set({ status: "error" });
      return false;
    }
  },

  saveCredentials: async (url, key, secret) => {
    const { settings } = get();
    const updatedSettings = {
      ...settings,
      wooUrl: url,
      consumerKey: key,
      consumerSecret: secret
    };
    
    try {
      if (invoke) {
        await invoke("write_encrypted_file", { contents: JSON.stringify(updatedSettings) });
      } else {
        localStorage.setItem('kr1-settings', JSON.stringify(updatedSettings));
      }
      set({
        settings: updatedSettings,
        status: "saved"
      });
      return true;
    } catch (error) {
      set({ status: "error" });
      return false;
    }
  },

  testConnection: async () => {
    try {
      if (invoke) {
        const valid = await invoke("test_woo_connection", {
          url: get().settings.wooUrl,
          key: get().settings.consumerKey,
          secret: get().settings.consumerSecret
        });
        set({ status: valid ? "connected" : "failed" });
        return valid;
      } else {
        // Browser fallback - basic URL validation
        const { wooUrl, consumerKey, consumerSecret } = get().settings;
        const isValid = wooUrl && consumerKey && consumerSecret;
        set({ status: isValid ? "connected" : "failed" });
        return isValid;
      }
    } catch (error) {
      set({ status: "error" });
      return false;
    }
  },

  validateOpenRouterApiKey: async (apiKey) => {
    if (!apiKey) {
      set(state => ({
        openRouterConfig: {
          ...state.openRouterConfig,
          isValidated: false,
          isConnected: false
        }
      }));
      throw new Error('OpenRouter API key is required');
    }
    
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'WooCommerce AI Assistant'
        }
      });
      
      if (!response.ok) {
        set(state => ({
          openRouterConfig: {
            ...state.openRouterConfig,
            isValidated: false,
            isConnected: false
          }
        }));
        throw new Error(`OpenRouter API validation failed: ${response.status}`);
      }
      
      set(state => ({
        openRouterConfig: {
          ...state.openRouterConfig,
          isValidated: true
        }
      }));
      
      return true;
    } catch (error) {
      set(state => ({
        openRouterConfig: {
          ...state.openRouterConfig,
          isValidated: false,
          isConnected: false
        }
      }));
      console.error('OpenRouter API validation failed:', error);
      throw error;
    }
  },

  saveOpenRouterApiKey: async (apiKey) => {
    try {
      if (invoke) {
        await invoke("save_api_key", { key: "openrouter", value: apiKey });
      } else {
        localStorage.setItem('kr-openrouter-api-key', apiKey);
      }
      
      set(state => ({
        openRouterConfig: {
          ...state.openRouterConfig,
          apiKey: apiKey,
          isConnected: true
        }
      }));
      
      return true;
    } catch (error) {
      console.error('Failed to save OpenRouter API key:', error);
      return false;
    }
  },

  loadApiKeys: async () => {
    try {
      let openRouterApiKey = "";
      
      if (invoke) {
        try {
          openRouterApiKey = await invoke("load_api_key", { key: "openrouter" });
        } catch (error) {
          console.warn("No saved OpenRouter API key found");
        }
      } else {
        openRouterApiKey = localStorage.getItem('kr-openrouter-api-key') || "";
      }

      // Update OpenRouter config with loaded API key
      set((state) => ({
        openRouterConfig: {
          ...state.openRouterConfig,
          apiKey: openRouterApiKey,
          isConnected: openRouterApiKey ? true : false,
          isValidated: openRouterApiKey ? true : false
        }
      }));
      
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  validateMerchantguyApiKey: async (apiKey, url) => {
    if (!apiKey) {
      throw new Error('Merchantguy API key is required');
    }
    
    if (!url) {
      throw new Error('Merchantguy URL is required');
    }
    
    try {
      // Test the Merchantguy API key using their query methodology
      console.log('Validating Merchantguy API key against URL:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          security_key: apiKey,
          type: 'check_credentials'
        })
      });
      
      if (!response.ok) {
        throw new Error(`Merchantguy API validation failed: ${response.status}`);
      }
      
      const result = await response.text();
      // Check for successful authentication response
      return result.includes('response=1') || result.includes('SUCCESS');
    } catch (error) {
      console.error('Merchantguy API validation failed:', error);
      throw error;
    }
  },

  validateOntraportApiKey: async (apiKey, appId) => {
    if (!apiKey) {
      throw new Error('Ontraport API key is required');
    }
    
    if (!appId) {
      throw new Error('Ontraport App ID is required');
    }
    
    try {
      // Test the Ontraport API key with their objects meta endpoint
      const response = await fetch('https://api.ontraport.com/1/objects/meta', {
        method: 'GET',
        headers: {
          'Api-Appid': appId,
          'Api-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Ontraport API validation failed: ${response.status}`);
      }
      
      const result = await response.json();
      // Check if we get valid object metadata
      return result && result.data && Array.isArray(result.data);
    } catch (error) {
      console.error('Ontraport API validation failed:', error);
      throw error;
    }
  },

  saveMerchantguyApiKey: async (apiKey) => {
    try {
      const { settings } = get();
      const updatedSettings = {
        ...settings,
        merchantguyApiKey: apiKey
      };
      
      if (invoke) {
        await invoke("write_encrypted_file", { contents: JSON.stringify(updatedSettings) });
      } else {
        localStorage.setItem('kr1-settings', JSON.stringify(updatedSettings));
      }
      
      set({
        settings: updatedSettings,
        status: "saved"
      });
      
      return true;
    } catch (error) {
      set({ status: "error" });
      console.error('Failed to save Merchantguy API key:', error);
      return false;
    }
  },

  saveOntraportCredentials: async (apiKey, appId) => {
    try {
      const { settings } = get();
      const updatedSettings = {
        ...settings,
        ontraportApiKey: apiKey,
        ontraportAppId: appId
      };
      
      if (invoke) {
        await invoke("write_encrypted_file", { contents: JSON.stringify(updatedSettings) });
      } else {
        localStorage.setItem('kr1-settings', JSON.stringify(updatedSettings));
      }
      
      set({
        settings: updatedSettings,
        status: "saved"
      });
      
      return true;
    } catch (error) {
      set({ status: "error" });
      console.error('Failed to save Ontraport credentials:', error);
      return false;
    }
  },

  validateZendeskCredentials: async (domain, email, apiToken) => {
    try {
      // Test Zendesk API credentials using the users endpoint
      const response = await fetch(`https://${domain}.zendesk.com/api/v2/users/me.json`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${email}/token:${apiToken}`)}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        return false;
      }
      
      const result = await response.json();
      return result && result.user && result.user.id;
    } catch (error) {
      console.error('Zendesk API validation error:', error);
      return false;
    }
  },

  saveZendeskCredentials: async (domain, email, apiToken) => {
    try {
      const { settings } = get();
      const updatedSettings = {
        ...settings,
        zendeskDomain: domain,
        zendeskEmail: email,
        zendeskApiToken: apiToken
      };
      
      if (invoke) {
        await invoke("write_encrypted_file", { contents: JSON.stringify(updatedSettings) });
      } else {
        localStorage.setItem('kr1-settings', JSON.stringify(updatedSettings));
      }
      
      set({
        settings: updatedSettings,
        status: "saved"
      });
      
      return true;
    } catch (error) {
      set({ status: "error" });
      console.error('Failed to save Zendesk credentials:', error);
      return false;
    }
  },

  getZendeskData: async (query) => {
    const { settings } = get();
    
    if (!settings.zendeskDomain || !settings.zendeskEmail || !settings.zendeskApiToken) {
      throw new Error('Zendesk credentials not configured');
    }
    
    try {
      let endpoint = '/api/v2/tickets.json?sort_by=created_at&sort_order=desc&per_page=10';
      const lowerQuery = query.toLowerCase();
      
      if (lowerQuery.includes('user')) {
        endpoint = '/api/v2/users.json?per_page=10';
      } else if (lowerQuery.includes('organization')) {
        endpoint = '/api/v2/organizations.json?per_page=10';
      } else if (lowerQuery.includes('group')) {
        endpoint = '/api/v2/groups.json';
      }
      
      const response = await fetch(`https://${settings.zendeskDomain}.zendesk.com${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${settings.zendeskEmail}/token:${settings.zendeskApiToken}`)}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Zendesk API Error: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        data: data.tickets || data.users || data.organizations || data.groups || [],
        total: data.count || 0,
        next_page: data.next_page
      };
    } catch (error) {
      console.error('Zendesk API error:', error);
      throw error;
    }
  },

  // RAG Service Methods
  initializeRAG: async () => {
    set(state => ({
      ragConfig: {
        ...state.ragConfig,
        isInitializing: true,
        lastError: null
      }
    }));

    try {
      const success = await ragService.initialize();
      
      if (success) {
        const collectionInfo = await ragService.getCollectionInfo();
        set(state => ({
          ragConfig: {
            ...state.ragConfig,
            isInitialized: true,
            isInitializing: false,
            documentsCount: collectionInfo.pointsCount || 0
          }
        }));
        return true;
      } else {
        throw new Error('RAG service initialization failed');
      }
    } catch (error) {
      console.error('RAG initialization error:', error);
      set(state => ({
        ragConfig: {
          ...state.ragConfig,
          isInitialized: false,
          isInitializing: false,
          lastError: error.message
        }
      }));
      return false;
    }
  },

  addDocumentToRAG: async (content, metadata = {}) => {
    try {
      if (!get().ragConfig.isInitialized) {
        throw new Error('RAG service not initialized');
      }

      const documentId = await ragService.addDocument(content, metadata);
      
      // Update documents count
      const collectionInfo = await ragService.getCollectionInfo();
      set(state => ({
        ragConfig: {
          ...state.ragConfig,
          documentsCount: collectionInfo.pointsCount || 0
        }
      }));

      return documentId;
    } catch (error) {
      console.error('Error adding document to RAG:', error);
      throw error;
    }
  },

  searchRAGDocuments: async (query, limit = 5) => {
    try {
      if (!get().ragConfig.isInitialized) {
        throw new Error('RAG service not initialized');
      }

      return await ragService.searchSimilar(query, limit);
    } catch (error) {
      console.error('Error searching RAG documents:', error);
      throw error;
    }
  },

  getRAGContext: async (query) => {
    try {
      if (!get().ragConfig.isInitialized) {
        return '';
      }

      return await ragService.retrieveContext(query);
    } catch (error) {
      console.error('Error getting RAG context:', error);
      return '';
    }
  },

  processFilesForRAG: async (files) => {
    try {
      if (!get().ragConfig.isInitialized) {
        throw new Error('RAG service not initialized');
      }

      const results = await ragService.processUploadedFiles(files);
      
      // Update documents count
      const collectionInfo = await ragService.getCollectionInfo();
      set(state => ({
        ragConfig: {
          ...state.ragConfig,
          documentsCount: collectionInfo.pointsCount || 0
        }
      }));

      return results;
    } catch (error) {
      console.error('Error processing files for RAG:', error);
      throw error;
    }
  },

  clearRAGCollection: async () => {
    try {
      if (!get().ragConfig.isInitialized) {
        throw new Error('RAG service not initialized');
      }

      await ragService.clearCollection();
      
      set(state => ({
        ragConfig: {
          ...state.ragConfig,
          documentsCount: 0
        }
      }));

      return true;
    } catch (error) {
      console.error('Error clearing RAG collection:', error);
      throw error;
    }
  },

  getRAGStatus: () => {
    return get().ragConfig;
  },

  stopGeneration: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
      set({ abortController: null, isLoading: false });
    }
  }
}));

useStore.getState().init();

export default useStore;
