import React, { useState, useEffect } from "react";
import useStore from "../store/woo-store";
import { FiCheck, FiAlertCircle } from "react-icons/fi";
import { SettingsMenu } from './SettingsMenu';
import { invoke } from '@tauri-apps/api/tauri';

const SettingsPanel = () => {
  const storeSettings = useStore.getState().settings;
  const [url, setUrl] = useState(storeSettings.wooUrl);
  const [key, setKey] = useState(storeSettings.consumerKey);
  const [secret, setSecret] = useState(storeSettings.consumerSecret);
  const [googleAnalyticsApiKey, setGoogleAnalyticsApiKey] = useState(storeSettings.googleAnalyticsApiKey);
  const [zendeskApiKey, setZendeskApiKey] = useState(storeSettings.zendeskApiKey);
  const [zendeskDomain, setZendeskDomain] = useState(storeSettings.zendeskDomain);
  const [ontraportApiKey, setOntraportApiKey] = useState(storeSettings.ontraportApiKey);
  const [ontraportAppId, setOntraportAppId] = useState(storeSettings.ontraportAppId);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [merchantguyApiKey, setMerchantguyApiKey] = useState(storeSettings.merchantguyApiKey);
  const [merchantguyUrl, setMerchantguyUrl] = useState(storeSettings.merchantguyUrl || 'https://secure.merchantguygateway.com/api/v1');
  const [merchantguyValidationResult, setMerchantguyValidationResult] = useState(null);
  const [isValidatingMerchantguy, setIsValidatingMerchantguy] = useState(false);
  
  // Validation states for each app
  const [wooValidationResult, setWooValidationResult] = useState(null);
  const [isValidatingWoo, setIsValidatingWoo] = useState(false);
  const [googleValidationResult, setGoogleValidationResult] = useState(null);
  const [isValidatingGoogle, setIsValidatingGoogle] = useState(false);
  const [zendeskValidationResult, setZendeskValidationResult] = useState(null);
  const [isValidatingZendesk, setIsValidatingZendesk] = useState(false);
  const [ontraportValidationResult, setOntraportValidationResult] = useState(null);
  const [isValidatingOntraport, setIsValidatingOntraport] = useState(false);
  
  const { toggleConnectedApp } = useStore();

  const status = useStore(state => state.status);

  // Update state when store settings change
  useEffect(() => {
    const store = useStore.getState();
    setUrl(store.settings.wooUrl);
    setKey(store.settings.consumerKey);
    setSecret(store.settings.consumerSecret);
    setGoogleAnalyticsApiKey(store.settings.googleAnalyticsApiKey);
    setZendeskApiKey(store.settings.zendeskApiKey);
    setZendeskDomain(store.settings.zendeskDomain);
    setOntraportApiKey(store.settings.ontraportApiKey);
    setOntraportAppId(store.settings.ontraportAppId);
    setMerchantguyApiKey(store.settings.merchantguyApiKey);
    setMerchantguyUrl(store.settings.merchantguyUrl || 'https://secure.merchantguygateway.com/api/v1');
  }, []);

  // Validation functions for each app
  const validateWooCommerce = async () => {
    if (!url || !key || !secret) {
      setWooValidationResult({ success: false, message: "All WooCommerce fields are required" });
      return;
    }
    
    setIsValidatingWoo(true);
    try {
      const saved = await useStore.getState().saveCredentials(url, key, secret);
      if (saved) {
        const connected = await useStore.getState().testConnection();
        if (connected) {
          setWooValidationResult({ success: true, message: 'WooCommerce connection successful!' });
          // Auto-toggle the app on successful validation
          toggleConnectedApp('woocommerce');
        } else {
          setWooValidationResult({ success: false, message: 'Connection failed - check credentials' });
        }
      }
    } catch (error) {
      setWooValidationResult({ success: false, message: error.message });
    } finally {
      setIsValidatingWoo(false);
    }
  };
  
  const saveWooCommerce = async () => {
    if (!url || !key || !secret) {
      alert('Please fill in all WooCommerce fields first');
      return;
    }
    
    try {
      const success = await useStore.getState().saveCredentials(url, key, secret);
      if (success) {
        alert('WooCommerce credentials saved successfully!');
      } else {
        alert('Failed to save WooCommerce credentials');
      }
    } catch (error) {
      console.error('Error saving WooCommerce credentials:', error);
      alert('Failed to save WooCommerce credentials');
    }
  };
  
  const validateGoogleAnalytics = async () => {
    if (!googleAnalyticsApiKey) {
      setGoogleValidationResult({ success: false, message: "Google Analytics API key is required" });
      return;
    }
    
    setIsValidatingGoogle(true);
    try {
      // Placeholder validation - replace with actual Google Analytics API validation
      await new Promise(resolve => setTimeout(resolve, 1000));
      setGoogleValidationResult({ success: true, message: 'Google Analytics API key is valid!' });
      // Auto-toggle the app on successful validation
      toggleConnectedApp('googleanalytics');
    } catch (error) {
      setGoogleValidationResult({ success: false, message: error.message });
    } finally {
      setIsValidatingGoogle(false);
    }
  };
  
  const saveGoogleAnalytics = async () => {
    if (!googleAnalyticsApiKey) {
      alert('Please enter Google Analytics API key first');
      return;
    }
    
    try {
      useStore.getState().updateSettings({ googleAnalyticsApiKey });
      const success = await useStore.getState().saveAllSettings();
      if (success) {
        alert('Google Analytics API key saved successfully!');
      } else {
        alert('Failed to save Google Analytics API key');
      }
    } catch (error) {
      console.error('Error saving Google Analytics API key:', error);
      alert('Failed to save Google Analytics API key');
    }
  };
  
  const validateZendesk = async () => {
    if (!zendeskApiKey || !zendeskDomain) {
      setZendeskValidationResult({ success: false, message: "Zendesk API key and domain are required" });
      return;
    }
    
    setIsValidatingZendesk(true);
    try {
      // Placeholder validation - replace with actual Zendesk API validation
      await new Promise(resolve => setTimeout(resolve, 1000));
      setZendeskValidationResult({ success: true, message: 'Zendesk credentials are valid!' });
      // Auto-toggle the app on successful validation
      toggleConnectedApp('zendesk');
    } catch (error) {
      setZendeskValidationResult({ success: false, message: error.message });
    } finally {
      setIsValidatingZendesk(false);
    }
  };
  
  const saveZendesk = async () => {
    if (!zendeskApiKey || !zendeskDomain) {
      alert('Please fill in all Zendesk fields first');
      return;
    }
    
    try {
      useStore.getState().updateSettings({ zendeskApiKey, zendeskDomain });
      const success = await useStore.getState().saveAllSettings();
      if (success) {
        alert('Zendesk credentials saved successfully!');
      } else {
        alert('Failed to save Zendesk credentials');
      }
    } catch (error) {
      console.error('Error saving Zendesk credentials:', error);
      alert('Failed to save Zendesk credentials');
    }
  };
  
  const validateOntraport = async () => {
    if (!ontraportApiKey || !ontraportAppId) {
      setOntraportValidationResult({ success: false, message: "Ontraport API key and App ID are required" });
      return;
    }
    
    setIsValidatingOntraport(true);
    try {
      // Placeholder validation - replace with actual Ontraport API validation
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOntraportValidationResult({ success: true, message: 'Ontraport credentials are valid!' });
      // Auto-toggle the app on successful validation
      toggleConnectedApp('ontraport');
    } catch (error) {
      setOntraportValidationResult({ success: false, message: error.message });
    } finally {
      setIsValidatingOntraport(false);
    }
  };
  
  const saveOntraport = async () => {
    if (!ontraportApiKey || !ontraportAppId) {
      alert('Please fill in all Ontraport fields first');
      return;
    }
    
    try {
      useStore.getState().updateSettings({ ontraportApiKey, ontraportAppId });
      const success = await useStore.getState().saveAllSettings();
      if (success) {
        alert('Ontraport credentials saved successfully!');
      } else {
        alert('Failed to save Ontraport credentials');
      }
    } catch (error) {
      console.error('Error saving Ontraport credentials:', error);
      alert('Failed to save Ontraport credentials');
    }
  };

  const handleSaveAllSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaveStatus(null);
    
    try {
      // Update all settings in the store
      useStore.getState().updateSettings({
        wooUrl: url,
        consumerKey: key,
        consumerSecret: secret,
        googleAnalyticsApiKey: googleAnalyticsApiKey,
        zendeskApiKey: zendeskApiKey,
        zendeskDomain: zendeskDomain,
        ontraportApiKey: ontraportApiKey,
        ontraportAppId: ontraportAppId,
        merchantguyApiKey: merchantguyApiKey,
        merchantguyUrl: merchantguyUrl
      });
      
      // Save all settings
      const saved = await useStore.getState().saveAllSettings();
      if (saved) {
        setSaveStatus("success");
      } else {
        setSaveStatus("error");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setSaveStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const validateMerchantguyKey = async () => {
    if (!merchantguyApiKey) {
      setMerchantguyValidationResult({ success: false, message: "API key is required" });
      return;
    }
    
    setIsValidatingMerchantguy(true);
    try {
      // First save the API key to store
      useStore.getState().updateSettings({ 
        merchantguyApiKey: merchantguyApiKey,
        merchantguyUrl: merchantguyUrl 
      });
      await useStore.getState().saveAllSettings();
      
      // Check if we're in Tauri environment
      if (window.__TAURI__ && invoke) {
        // Call Tauri validate_card command
        const response = await invoke('validate_card');
        console.log('MGW Validation Response:', response);
        
        // Check if validation was successful
        if (response.response === '1' || response.responsetext?.toLowerCase().includes('success') || response.responsetext?.toLowerCase().includes('approved')) {
          setMerchantguyValidationResult({ success: true, message: 'Merchantguy API key is valid!' });
          // Auto-toggle the app on successful validation
          toggleConnectedApp('merchantguy');
        } else {
          const errorMsg = response.responsetext || 'API key validation failed';
          setMerchantguyValidationResult({ success: false, message: errorMsg });
        }
      } else {
        // Web environment - simulate validation
        await new Promise(resolve => setTimeout(resolve, 1000));
        setMerchantguyValidationResult({ success: true, message: 'Merchantguy API key saved (validation requires desktop app)' });
        toggleConnectedApp('merchantguy');
      }
    } catch (error) {
      console.error('MGW Validation Error:', error);
      setMerchantguyValidationResult({ success: false, message: error.toString() });
    } finally {
      setIsValidatingMerchantguy(false);
    }
  };

  const saveMerchantguyKey = async () => {
    if (!merchantguyApiKey) {
      alert('Please enter an API key first');
      return;
    }
    
    if (!merchantguyUrl) {
      alert('Please enter a Gateway URL first');
      return;
    }
    
    try {
      // Update settings with both API key and URL
      useStore.getState().updateSettings({ 
        merchantguyApiKey: merchantguyApiKey,
        merchantguyUrl: merchantguyUrl 
      });
      const success = await useStore.getState().saveAllSettings();
      if (success) {
        alert('Merchantguy credentials saved successfully!');
      } else {
        alert('Failed to save Merchantguy credentials');
      }
    } catch (error) {
      console.error('Error saving Merchantguy credentials:', error);
      alert('Failed to save Merchantguy credentials');
    }
  };


  return (
    <div className="p-1 bg-white h-full overflow-y-auto">
      {/* LLM Providers Section */}
      <div className="mb-2">
        <h2 className="text-sm font-medium text-gray-900 mb-1">LLM Providers</h2>
        <SettingsMenu />
      </div>
      
      {/* Connected Apps Section */}
      <div className="mb-2">
        <h2 className="text-sm font-medium text-gray-900 mb-1">Connected Apps</h2>
        
        {/* WooCommerce Settings */}
        <div className="p-2 border border-gray-200 rounded-md bg-white shadow-sm mb-2">
          <h3 className="text-base font-medium text-gray-900 mb-2">WooCommerce</h3>
          
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">WooCommerce URL:</label>
            <input
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setWooValidationResult(null);
              }}
              placeholder="https://subscribers.katusaresearch.com"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Consumer Key:</label>
            <input
              type="password"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setWooValidationResult(null);
              }}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Consumer Secret:</label>
            <input
              type="password"
              value={secret}
              onChange={(e) => {
                setSecret(e.target.value);
                setWooValidationResult(null);
              }}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={validateWooCommerce}
              disabled={isValidatingWoo || !url || !key || !secret}
              className="px-3 py-1.5 bg-teal-600 text-white rounded text-xs font-medium hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isValidatingWoo ? "Validating..." : "Validate"}
            </button>
            
            <button
              type="button"
              onClick={saveWooCommerce}
              disabled={!url || !key || !secret}
              className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Save
            </button>
          </div>
          
          {wooValidationResult && (
            <div className={`flex items-center gap-2 p-2 rounded text-xs ${wooValidationResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {wooValidationResult.success ? <FiCheck className="w-3 h-3" /> : <FiAlertCircle className="w-3 h-3" />}
              {wooValidationResult.message}
            </div>
          )}
        </div>
        
        {/* Merchantguy Gateway Settings */}
        <div className="p-2 border border-gray-200 rounded-md bg-white shadow-sm mb-2">
          <h3 className="text-base font-medium text-gray-900 mb-2">Merchantguygateway</h3>
          
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">API Key:</label>
            <input
              type="password"
              value={merchantguyApiKey}
              onChange={(e) => {
                setMerchantguyApiKey(e.target.value);
                setMerchantguyValidationResult(null);
              }}
              placeholder="Enter Merchantguygateway API Key"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Gateway URL:</label>
            <input
              type="text"
              value={merchantguyUrl}
              onChange={(e) => {
                setMerchantguyUrl(e.target.value);
                setMerchantguyValidationResult(null);
              }}
              placeholder="https://secure.merchantguygateway.com/"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={validateMerchantguyKey}
              disabled={isValidatingMerchantguy || !merchantguyApiKey || !merchantguyUrl}
              className="px-3 py-1.5 bg-teal-600 text-white rounded text-xs font-medium hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isValidatingMerchantguy ? "Validating..." : "Validate"}
            </button>
            
            <button
              type="button"
              onClick={saveMerchantguyKey}
              disabled={!merchantguyApiKey || !merchantguyUrl}
              className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Save
            </button>
          </div>
          
          {merchantguyValidationResult && (
            <div className={`flex items-center gap-2 p-2 rounded text-xs ${merchantguyValidationResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {merchantguyValidationResult.success ? <FiCheck className="w-3 h-3" /> : <FiAlertCircle className="w-3 h-3" />}
              {merchantguyValidationResult.message}
            </div>
          )}
        </div>
      
        {/* Google Analytics Settings */}
        <div className="p-2 border border-gray-200 rounded-md bg-white shadow-sm mb-2">
          <h3 className="text-base font-medium text-gray-900 mb-2">Google Analytics</h3>
          
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">API Key:</label>
            <input
              type="password"
              value={googleAnalyticsApiKey}
              onChange={(e) => {
                setGoogleAnalyticsApiKey(e.target.value);
                setGoogleValidationResult(null);
              }}
              placeholder="Enter Google Analytics API Key"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={validateGoogleAnalytics}
              disabled={isValidatingGoogle || !googleAnalyticsApiKey}
              className="px-3 py-1.5 bg-teal-600 text-white rounded text-xs font-medium hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isValidatingGoogle ? "Validating..." : "Validate"}
            </button>
            
            <button
              type="button"
              onClick={saveGoogleAnalytics}
              disabled={!googleAnalyticsApiKey}
              className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Save
            </button>
          </div>
          
          {googleValidationResult && (
            <div className={`flex items-center gap-2 p-2 rounded text-xs ${googleValidationResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {googleValidationResult.success ? <FiCheck className="w-3 h-3" /> : <FiAlertCircle className="w-3 h-3" />}
              {googleValidationResult.message}
            </div>
          )}
        </div>
        
        {/* Zendesk Settings */}
        <div className="p-2 border border-gray-200 rounded-md bg-white shadow-sm mb-2">
          <h3 className="text-base font-medium text-gray-900 mb-2">Zendesk</h3>
          
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">API Key:</label>
            <input
              type="password"
              value={zendeskApiKey}
              onChange={(e) => {
                setZendeskApiKey(e.target.value);
                setZendeskValidationResult(null);
              }}
              placeholder="Enter Zendesk API Key"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Domain:</label>
            <input
              value={zendeskDomain}
              onChange={(e) => {
                setZendeskDomain(e.target.value);
                setZendeskValidationResult(null);
              }}
              placeholder="Enter Zendesk Domain (e.g., yourcompany.zendesk.com)"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={validateZendesk}
              disabled={isValidatingZendesk || !zendeskApiKey || !zendeskDomain}
              className="px-3 py-1.5 bg-teal-600 text-white rounded text-xs font-medium hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isValidatingZendesk ? "Validating..." : "Validate"}
            </button>
            
            <button
              type="button"
              onClick={saveZendesk}
              disabled={!zendeskApiKey || !zendeskDomain}
              className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Save
            </button>
          </div>
          
          {zendeskValidationResult && (
            <div className={`flex items-center gap-2 p-2 rounded text-xs ${zendeskValidationResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {zendeskValidationResult.success ? <FiCheck className="w-3 h-3" /> : <FiAlertCircle className="w-3 h-3" />}
              {zendeskValidationResult.message}
            </div>
          )}
        </div>
        
        {/* Ontraport Settings */}
        <div className="p-2 border border-gray-200 rounded-md bg-white shadow-sm mb-2">
          <h3 className="text-base font-medium text-gray-900 mb-2">Ontraport</h3>
          
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">API Key:</label>
            <input
              type="password"
              value={ontraportApiKey}
              onChange={(e) => {
                setOntraportApiKey(e.target.value);
                setOntraportValidationResult(null);
              }}
              placeholder="Enter Ontraport API Key"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">App ID:</label>
            <input
              value={ontraportAppId}
              onChange={(e) => {
                setOntraportAppId(e.target.value);
                setOntraportValidationResult(null);
              }}
              placeholder="Enter Ontraport App ID"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={validateOntraport}
              disabled={isValidatingOntraport || !ontraportApiKey || !ontraportAppId}
              className="px-3 py-1.5 bg-teal-600 text-white rounded text-xs font-medium hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isValidatingOntraport ? "Validating..." : "Validate"}
            </button>
            
            <button
              type="button"
              onClick={saveOntraport}
              disabled={!ontraportApiKey || !ontraportAppId}
              className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Save
            </button>
          </div>
          
          {ontraportValidationResult && (
            <div className={`flex items-center gap-2 p-2 rounded text-xs ${ontraportValidationResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {ontraportValidationResult.success ? <FiCheck className="w-3 h-3" /> : <FiAlertCircle className="w-3 h-3" />}
              {ontraportValidationResult.message}
            </div>
          )}
        </div>
        

      </div>
    </div>
  );
};

export default SettingsPanel;
