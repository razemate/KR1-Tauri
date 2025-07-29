import { invoke } from '@tauri-apps/api/tauri';

/**
 * Data Retrieval Service
 * 
 * This service provides a secure interface to retrieve data from connected applications
 * through Tauri's Rust backend. All operations are read-only for data security.
 */

class DataRetrievalService {
  async getMerchantguyTransactions(searchParams = {}) {
    try {
      // Call Tauri backend for secure data retrieval
      const result = await invoke('get_mgw_transactions', { 
        searchParams: {
          start_date: searchParams.startDate || '1970-01-01',
          end_date: searchParams.endDate || new Date().toISOString().split('T')[0],
          transaction_type: searchParams.transactionType || 'all',
          search_query: searchParams.searchQuery || ''
        }
      });
      
      return {
        success: true,
        data: result.transactions || [],
        total: result.total || 0,
        message: 'Transaction data retrieved successfully'
      };
    } catch (error) {
      console.error('Data retrieval error:', error);
      return {
        success: false,
        error: error.message || 'Failed to retrieve transaction data'
      };
    }
  }

  async getWooCommerceOrders(searchParams = {}) {
    try {
      // Call Tauri backend for WooCommerce data retrieval
      const result = await invoke('get_woo_orders', { 
        searchParams: {
          start_date: searchParams.startDate || '1970-01-01',
          end_date: searchParams.endDate || new Date().toISOString().split('T')[0],
          status: searchParams.transactionType || 'any',
          search_query: searchParams.searchQuery || ''
        }
      });
      
      return {
        success: true,
        data: result.orders || [],
        total: result.total || 0,
        message: 'WooCommerce data retrieved successfully'
      };
    } catch (error) {
      console.error('WooCommerce data retrieval error:', error);
      return {
        success: false,
        error: error.message || 'Failed to retrieve WooCommerce data'
      };
    }
  }

  formatDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }

  validateSearchParams(params) {
    const errors = [];
    
    if (params.startDate && params.endDate) {
      const start = new Date(params.startDate);
      const end = new Date(params.endDate);
      
      if (start > end) {
        errors.push('Start date cannot be after end date');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// WooCommerce Service
class WooCommerceService {
  /**
   * Make secure READ-only API call to WooCommerce
   * @param {string} endpoint - API endpoint (e.g., 'products', 'orders')
   * @param {string} method - HTTP method (ONLY GET ALLOWED)
   * @param {Object} data - Request data (IGNORED - READ-ONLY)
   * @param {Object} credentials - WooCommerce credentials
   * @returns {Promise<Object>} API response
   */
  async apiCall(endpoint, method = 'GET', data = null, credentials = null) {
    try {
      // SECURITY: Force all requests to be GET (read-only)
      if (method.toUpperCase() !== 'GET') {
        throw new Error('SECURITY VIOLATION: Only GET requests allowed. This app is read-only.');
      }
      
      const request = {
        endpoint,
        method: 'GET', // Force GET method
        data: null // Force no data for read-only
      };
      
      // Add credentials if provided
      if (credentials) {
        request.woo_url = credentials.wooUrl;
        request.consumer_key = credentials.consumerKey;
        request.consumer_secret = credentials.consumerSecret;
      }
      
      const response = await invoke('call_woocommerce_api', {
        request
      });

      if (!response.success) {
        throw new Error(response.error || 'WooCommerce API call failed');
      }

      return response.data;
    } catch (error) {
      console.error('WooCommerce API error:', error);
      throw error;
    }
  }

  /**
   * Get products from WooCommerce
   * @param {Object} params - Query parameters
   * @param {Object} credentials - WooCommerce credentials
   * @returns {Promise<Array>} Products array
   */
  async getProducts(params = {}, credentials = null) {
    // Clean up parameters and ensure proper formatting
    const cleanParams = {};
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        cleanParams[key] = params[key];
      }
    });
    
    const queryString = new URLSearchParams(cleanParams).toString();
    const endpoint = queryString ? `products?${queryString}` : 'products';
    return this.apiCall(endpoint, 'GET', null, credentials);
  }

  /**
   * Get orders from WooCommerce
   * @param {Object} params - Query parameters
   * @param {Object} credentials - WooCommerce credentials
   * @returns {Promise<Array>} Orders array
   */
  async getOrders(params = {}, credentials = null) {
    // Clean up parameters and ensure proper formatting
    const cleanParams = {};
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        cleanParams[key] = params[key];
      }
    });
    
    const queryString = new URLSearchParams(cleanParams).toString();
    const endpoint = queryString ? `orders?${queryString}` : 'orders';
    return this.apiCall(endpoint, 'GET', null, credentials);
  }

  // DATA MODIFICATION FUNCTIONS REMOVED FOR READ-ONLY SECURITY
  // This service is strictly for data retrieval only

  /**
   * Get customers from WooCommerce
   * @param {Object} params - Query parameters
   * @param {Object} credentials - WooCommerce credentials
   * @returns {Promise<Array>} Customers array
   */
  async getCustomers(params = {}, credentials = null) {
    // Clean up parameters and ensure proper formatting
    const cleanParams = {};
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        cleanParams[key] = params[key];
      }
    });
    
    const queryString = new URLSearchParams(cleanParams).toString();
    const endpoint = queryString ? `customers?${queryString}` : 'customers';
    return this.apiCall(endpoint, 'GET', null, credentials);
  }
}

// Export service instances
export const dataRetrievalService = new DataRetrievalService();
export const wooCommerceService = new WooCommerceService();

// Export classes for custom instances
export { DataRetrievalService, WooCommerceService };