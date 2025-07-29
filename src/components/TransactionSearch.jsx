import React, { useState } from 'react';
import useStore from '../store/woo-store';
import { dataRetrievalService } from '../services/dataService';
import { FaSearch, FaSpinner, FaCheckCircle, FaExclamationTriangle, FaDownload, FaDatabase } from 'react-icons/fa';

const TransactionSearch = ({ onSearchSuccess, onSearchError }) => {
  const { getMerchantguyData, getWooCommerceData, settings, isLoading } = useStore();
  const [searchParams, setSearchParams] = useState({
    startDate: '1970-01-01',
    endDate: new Date().toISOString().split('T')[0],
    transactionType: 'all',
    searchQuery: ''
  });

  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle transaction search
  const handleSearch = async (e) => {
    e.preventDefault();
    
    setSearching(true);
    setSearchResult(null);

    try {
      let results = {};
      
      // Search MerchantGuy transactions if configured
      if (settings.merchantguyApiKey) {
        const mgwData = await dataRetrievalService.getMerchantguyTransactions({
          startDate: searchParams.startDate,
          endDate: searchParams.endDate,
          searchQuery: searchParams.searchQuery
        });
        results.merchantguy = mgwData;
      }
      
      // Search WooCommerce data if configured
      if (settings.wooUrl && settings.consumerKey) {
        const wooData = await dataRetrievalService.getWooCommerceOrders({
          startDate: searchParams.startDate,
          endDate: searchParams.endDate,
          searchQuery: searchParams.searchQuery
        });
        results.woocommerce = wooData;
      }
      
      setSearchResult({
        success: true,
        data: results,
        timestamp: new Date().toISOString(),
        searchParams
      });
      
      onSearchSuccess?.(results);
    } catch (error) {
      const errorMessage = error.message || 'Data retrieval failed';
      setSearchResult({ success: false, error: errorMessage });
      onSearchError?.(errorMessage);
    } finally {
      setSearching(false);
    }
  };

  // Export data as JSON
  const exportData = () => {
    if (!searchResult?.data) return;
    
    const dataStr = JSON.stringify(searchResult.data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transaction-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center mb-6">
        <FaDatabase className="text-blue-600 mr-2" />
        <h2 className="text-2xl font-bold text-gray-800">Transaction Data Retrieval</h2>
      </div>

      {searchResult && (
        <div className={`mb-6 p-4 rounded-lg ${
          searchResult.success 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {searchResult.success ? (
                <FaCheckCircle className="text-green-600 mr-2" />
              ) : (
                <FaExclamationTriangle className="text-red-600 mr-2" />
              )}
              <div>
                <p className={`font-semibold ${
                  searchResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {searchResult.success ? 'Data Retrieved Successfully!' : 'Data Retrieval Failed'}
                </p>
                {searchResult.success ? (
                  <div className="text-sm text-green-700 mt-1">
                    <p>Retrieved at: {new Date(searchResult.timestamp).toLocaleString()}</p>
                    <p>Sources: {Object.keys(searchResult.data).join(', ')}</p>
                  </div>
                ) : (
                  <p className="text-sm text-red-700 mt-1">
                    {searchResult.error || 'Please check your configuration and try again'}
                  </p>
                )}
              </div>
            </div>
            {searchResult.success && (
              <button
                onClick={exportData}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
              >
                <FaDownload className="mr-2" />
                Export JSON
              </button>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSearch} className="space-y-6">
        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              name="startDate"
              value={searchParams.startDate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              name="endDate"
              value={searchParams.endDate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Transaction Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Transaction Type
          </label>
          <select
            name="transactionType"
            value={searchParams.transactionType}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Transactions</option>
            <option value="sale">Sales</option>
            <option value="refund">Refunds</option>
            <option value="void">Voids</option>
          </select>
        </div>

        {/* Search Query */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Query (Optional)
          </label>
          <input
            type="text"
            name="searchQuery"
            value={searchParams.searchQuery}
            onChange={handleInputChange}
            placeholder="Enter search terms (e.g., customer name, order ID, product)..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Search Button */}
        <div>
          <button
            type="submit"
            disabled={searching || isLoading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {searching || isLoading ? (
              <>
                <FaSpinner className="animate-spin mr-2" />
                Retrieving Data...
              </>
            ) : (
              <>
                <FaSearch className="mr-2" />
                Retrieve Transaction Data
              </>
            )}
          </button>
        </div>
      </form>

      {/* Data Sources Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center text-sm text-gray-600">
          <FaDatabase className="text-blue-600 mr-2" />
          <span>
            This interface retrieves unlimited historical data from all connected sources. 
            No data limits - access complete transaction history since the beginning of time.
          </span>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          <p>• MerchantGuy Gateway: {settings.merchantguyApiKey ? '✅ Connected' : '❌ Not configured'}</p>
          <p>• WooCommerce: {settings.wooUrl && settings.consumerKey ? '✅ Connected' : '❌ Not configured'}</p>
        </div>
      </div>
    </div>
  );
};

export default TransactionSearch;