import React, { useState } from 'react';
import useStore from '../store/woo-store';
import { FiCheck, FiAlertCircle, FiExternalLink, FiEye, FiEyeOff } from 'react-icons/fi';

type ValidationResult = {
  success: boolean;
  message: string;
};

export const SettingsMenu = () => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  
  const openRouterConfig = useStore(state => state.openRouterConfig);
  const setOpenRouterApiKey = useStore(state => state.setOpenRouterApiKey);
  const validateOpenRouterApiKey = useStore(state => state.validateOpenRouterApiKey);
  const saveOpenRouterApiKey = useStore(state => state.saveOpenRouterApiKey);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOpenRouterApiKey(e.target.value);
    setValidationResult(null);
  };

  const validateKey = async () => {
    if (!openRouterConfig.apiKey) {
      setValidationResult({ success: false, message: "API key is required" });
      return;
    }
    
    if (!openRouterConfig.apiKey.startsWith('sk-or-')) {
      setValidationResult({
        success: false,
        message: "Invalid OpenRouter API key format. Should start with 'sk-or-'"
      });
      return;
    }
    
    if (openRouterConfig.apiKey.length < 32) {
      setValidationResult({
        success: false,
        message: `OpenRouter API key too short. Current length: ${openRouterConfig.apiKey.length}`
      });
      return;
    }

    setIsValidating(true);
    try {
      await validateOpenRouterApiKey(openRouterConfig.apiKey);
      setValidationResult({ success: true, message: 'OpenRouter API key is valid!' });
    } catch (error) {
      setValidationResult({ success: false, message: error.message });
    } finally {
      setIsValidating(false);
    }
  };

  const saveKey = async () => {
    if (!openRouterConfig.apiKey) {
      alert('Please enter an API key first');
      return;
    }
    
    try {
      const success = await saveOpenRouterApiKey(openRouterConfig.apiKey);
      if (success) {
        alert('OpenRouter API key saved successfully!');
      } else {
        alert('Failed to save OpenRouter API key');
      }
    } catch (error) {
      console.error('Error saving OpenRouter API key:', error);
      alert('Failed to save OpenRouter API key');
    }
  };

  return (
    <div className="p-1 bg-white">
      <h4 className="text-xs font-medium text-gray-800 mb-1">OpenRouter Configuration</h4>
      
      <div className="flex items-center gap-2 p-1 bg-gray-50 rounded border border-gray-200 mb-1">
        <span className="text-xs font-medium text-gray-700">Current Provider:</span>
        <span className="text-xs font-medium text-green-600">OpenRouter (Default)</span>
      </div>

      <div className="p-1 border border-gray-200 rounded bg-white">
        <div className="flex justify-between items-center mb-2">
          <h5 className="text-sm font-medium text-gray-900">OpenRouter API Key</h5>
          <a 
            href="https://openrouter.ai/keys" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium hover:underline"
          >
            Get API Key <FiExternalLink size={12} />
          </a>
        </div>
              
        <div className="flex gap-2 items-start flex-wrap">
          <div className="relative flex items-center flex-1 min-w-[250px]">
            <input
              type={showApiKey ? "text" : "password"}
              value={openRouterConfig.apiKey}
              onChange={handleApiKeyChange}
              placeholder="Enter OpenRouter API key (sk-or-...)"
              className="w-full pr-8 pl-2 py-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 p-0 border-none bg-transparent cursor-pointer flex items-center justify-center"
            >
              {showApiKey ? <FiEyeOff size={14} /> : <FiEye size={14} />}
            </button>
          </div>
          
          <button
            type="button"
            onClick={validateKey}
            disabled={isValidating || !openRouterConfig.apiKey}
            className="px-3 py-2 bg-teal-600 text-white border-none rounded text-xs font-medium cursor-pointer hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isValidating ? "Validating..." : "Validate"}
          </button>
          
          <button
            type="button"
            onClick={saveKey}
            disabled={!openRouterConfig.apiKey}
            className="px-3 py-2 bg-green-600 text-white border-none rounded text-xs font-medium cursor-pointer hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Save
          </button>
        </div>
            
        <small className="text-xs text-gray-600 mt-2 block">Available Models: {openRouterConfig.availableModels?.length || 32}</small>
        <div className="border-t border-gray-200 my-2"></div>
        {validationResult && (
          <div className={`mt-2 p-2 rounded border ${
            validationResult.success 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5">
                {validationResult.success ? 
                  <FiCheck className="text-green-600" size={14} /> : 
                  <FiAlertCircle className="text-red-600" size={14} />
                }
              </div>
              <div className="flex-1">
                <div className="font-medium text-xs">{validationResult.message}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
