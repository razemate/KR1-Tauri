// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod encryption;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::PathBuf;
use tauri::command;
use tauri::AppHandle;
use reqwest::Client;
use dotenvy::dotenv;
use base64::Engine;
use base64::engine::general_purpose;
use urlencoding;
use encryption::{store_encryption_key, get_encryption_key, delete_encryption_key, encryption_key_exists};

#[derive(Debug, Serialize, Deserialize)]
struct TransactionSearchRequest {
    start_date: String,
    end_date: String,
    transaction_type: String,
    search_query: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct TransactionSearchResponse {
    success: bool,
    transactions: Vec<serde_json::Value>,
    total: u32,
    error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct OrderSearchRequest {
    start_date: String,
    end_date: String,
    status: String,
    search_query: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct OrderSearchResponse {
    success: bool,
    orders: Vec<serde_json::Value>,
    total: u32,
    error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct WooCommerceRequest {
    endpoint: String,
    method: String,
    data: Option<serde_json::Value>,
    woo_url: Option<String>,
    consumer_key: Option<String>,
    consumer_secret: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct WooCommerceResponse {
    success: bool,
    data: Option<serde_json::Value>,
    error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct EnvCredentials {
    woo_base_url: Option<String>,
    woo_key: Option<String>,
    woo_secret: Option<String>,
    merchantguy_base_url: Option<String>,
    merchantguy_key: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ValidateCardRequest {
    #[serde(rename = "apiKey")]
    api_key: String,
    url: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ValidateCardResponse {
    success: bool,
    error: Option<String>,
}

// Helper function to get app data directory
fn get_app_data_dir(app_handle: &AppHandle) -> Result<PathBuf, String> {
    app_handle
        .path_resolver()
        .app_data_dir()
        .ok_or_else(|| "Failed to get app data directory".to_string())
}

#[command]
async fn save_connected_apps(app_handle: AppHandle, apps: Vec<String>) -> Result<(), String> {
    let app_data_dir = get_app_data_dir(&app_handle)?;
    
    // Ensure the directory exists
    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    
    let file_path = app_data_dir.join("connected_apps.json");
    let json_data = serde_json::to_string(&apps)
        .map_err(|e| format!("Failed to serialize connected apps: {}", e))?;
    
    fs::write(file_path, json_data)
        .map_err(|e| format!("Failed to save connected apps: {}", e))?;
    
    Ok(())
}

#[command]
async fn get_connected_apps(app_handle: AppHandle) -> Result<Vec<String>, String> {
    let app_data_dir = get_app_data_dir(&app_handle)?;
    let file_path = app_data_dir.join("connected_apps.json");
    
    if !file_path.exists() {
        return Ok(vec![]);
    }
    
    let file_content = fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read connected apps file: {}", e))?;
    
    let apps: Vec<String> = serde_json::from_str(&file_content)
        .map_err(|e| format!("Failed to parse connected apps: {}", e))?;
    
    Ok(apps)
}

#[command]
async fn save_chat_sessions(app_handle: AppHandle, sessions: serde_json::Value) -> Result<(), String> {
    let app_data_dir = get_app_data_dir(&app_handle)?;
    
    // Ensure the directory exists
    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    
    let file_path = app_data_dir.join("chat_sessions.json");
    let json_data = serde_json::to_string(&sessions)
        .map_err(|e| format!("Failed to serialize chat sessions: {}", e))?;
    
    fs::write(file_path, json_data)
        .map_err(|e| format!("Failed to save chat sessions: {}", e))?;
    
    Ok(())
}

#[command]
async fn get_chat_sessions(app_handle: AppHandle) -> Result<serde_json::Value, String> {
    let app_data_dir = get_app_data_dir(&app_handle)?;
    let file_path = app_data_dir.join("chat_sessions.json");
    
    if !file_path.exists() {
        return Ok(serde_json::json!({}));
    }
    
    let file_content = fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read chat sessions file: {}", e))?;
    
    let sessions: serde_json::Value = serde_json::from_str(&file_content)
        .map_err(|e| format!("Failed to parse chat sessions: {}", e))?;
    
    Ok(sessions)
}

#[command]
async fn save_api_key(app_handle: AppHandle, key: String, value: String) -> Result<(), String> {
    let app_data_dir = get_app_data_dir(&app_handle)?;
    
    // Ensure the directory exists
    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    
    let file_path = app_data_dir.join("api_keys.json");
    
    // Load existing keys or create new map
    let mut api_keys: HashMap<String, String> = if file_path.exists() {
        let file_content = fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read API keys file: {}", e))?;
        serde_json::from_str(&file_content)
            .map_err(|e| format!("Failed to parse API keys: {}", e))?
    } else {
        HashMap::new()
    };
    
    // Update the specific key
    api_keys.insert(key, value);
    
    // Save back to file
    let json_data = serde_json::to_string(&api_keys)
        .map_err(|e| format!("Failed to serialize API keys: {}", e))?;
    
    fs::write(file_path, json_data)
        .map_err(|e| format!("Failed to save API keys: {}", e))?;
    
    Ok(())
}

#[command]
async fn validate_card(request: ValidateCardRequest) -> Result<ValidateCardResponse, String> {
    let client = Client::new();
    
    // Try to validate the API key by making a test request
    let test_url = format!("{}/api/validate", request.url.trim_end_matches('/'));
    
    let response = client
        .post(&test_url)
        .header("Authorization", format!("Bearer {}", request.api_key))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({ "test": true }))
        .send()
        .await;
    
    match response {
        Ok(resp) => {
            if resp.status().is_success() {
                Ok(ValidateCardResponse {
                    success: true,
                    error: None,
                })
            } else {
                Ok(ValidateCardResponse {
                    success: false,
                    error: Some(format!("HTTP {}: {}", resp.status(), resp.status().canonical_reason().unwrap_or("Unknown error"))),
                })
            }
        }
        Err(e) => {
            Ok(ValidateCardResponse {
                success: false,
                error: Some(format!("Connection failed: {}", e)),
            })
        }
    }
}

#[command]
async fn load_env_credentials() -> Result<EnvCredentials, String> {
    // Load from .env.prod if available, otherwise .env
    if dotenvy::from_filename(".env.prod").is_err() {
        dotenv().ok(); // Fallback to regular .env
    }
    
    Ok(EnvCredentials {
        woo_base_url: env::var("WOO_BASE_URL").ok(),
        woo_key: env::var("WOO_KEY").ok(),
        woo_secret: env::var("WOO_SECRET").ok(),
        merchantguy_base_url: env::var("MERCHANTGUY_BASE_URL").ok(),
        merchantguy_key: env::var("MERCHANTGUY_KEY").ok(),
    })
}

#[command]
async fn get_mgw_transactions(search_params: TransactionSearchRequest) -> Result<TransactionSearchResponse, String> {
    let mgw_url = env::var("MERCHANTGUY_BASE_URL")
        .map_err(|_| "MERCHANTGUY_BASE_URL not found in environment".to_string())?;
    let mgw_key = env::var("MERCHANTGUY_KEY")
        .map_err(|_| "MERCHANTGUY_KEY not found in environment".to_string())?;

    let client = Client::new();
    let mut params = HashMap::new();
    params.insert("username".to_string(), mgw_key);
    params.insert("password".to_string(), "".to_string());
    params.insert("type".to_string(), "query".to_string());
    params.insert("start_date".to_string(), search_params.start_date);
    params.insert("end_date".to_string(), search_params.end_date);
    
    if !search_params.search_query.is_empty() {
        params.insert("search".to_string(), search_params.search_query);
    }
    
    if search_params.transaction_type != "all" {
        params.insert("transaction_type".to_string(), search_params.transaction_type);
    }

    let response = client
        .post(&mgw_url)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Transaction query failed: {}", e))?;

    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read transaction response: {}", e))?;

    parse_mgw_transactions(&response_text)
}

#[command]
async fn get_woo_orders(search_params: OrderSearchRequest) -> Result<OrderSearchResponse, String> {
    let woo_url = env::var("WOO_BASE_URL")
        .map_err(|_| "WooCommerce URL not configured".to_string())?;
    let woo_key = env::var("WOO_KEY")
        .map_err(|_| "WooCommerce consumer key not configured".to_string())?;
    let woo_secret = env::var("WOO_SECRET")
        .map_err(|_| "WooCommerce consumer secret not configured".to_string())?;

    // Create basic auth header
    let auth_string = format!("{}:{}", woo_key, woo_secret);
    let auth_header = format!("Basic {}", general_purpose::STANDARD.encode(auth_string));

    // Build the full URL with query parameters
    let base_api_url = if woo_url.ends_with('/') {
        format!("{}wp-json/wc/v3", woo_url)
    } else {
        format!("{}/wp-json/wc/v3", woo_url)
    };
    
    let mut query_params = vec![
        format!("after={}", search_params.start_date),
        format!("before={}", search_params.end_date),
        "per_page=100".to_string(),
    ];
    
    if search_params.status != "any" {
        query_params.push(format!("status={}", search_params.status));
    }
    
    if !search_params.search_query.is_empty() {
        query_params.push(format!("search={}", search_params.search_query));
    }
    
    let full_url = format!("{}/orders?{}", base_api_url, query_params.join("&"));
    let client = Client::new();
    
    let response = client
        .get(&full_url)
        .header("Authorization", auth_header)
        .header("Content-Type", "application/json")
        .header("User-Agent", "KR1-App/1.0")
        .send()
        .await
        .map_err(|e| format!("WooCommerce API request failed: {}", e))?;

    let status = response.status();
    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;
    
    if status.is_success() {
        let orders: Vec<serde_json::Value> = serde_json::from_str(&response_text)
            .map_err(|e| format!("Failed to parse JSON: {}", e))?;
        
        Ok(OrderSearchResponse {
            success: true,
            orders: orders.clone(),
            total: orders.len() as u32,
            error: None,
        })
    } else {
        Ok(OrderSearchResponse {
            success: false,
            orders: vec![],
            total: 0,
            error: Some(format!("HTTP {}: {}", status, response_text)),
        })
    }
}

#[command]
async fn call_woocommerce_api(request: WooCommerceRequest) -> Result<WooCommerceResponse, String> {
    let woo_url = request.woo_url
        .or_else(|| env::var("WOO_BASE_URL").ok())
        .ok_or("WooCommerce URL not provided".to_string())?;
    let woo_key = request.consumer_key
        .or_else(|| env::var("WOO_KEY").ok())
        .ok_or("WooCommerce consumer key not provided".to_string())?;
    let woo_secret = request.consumer_secret
        .or_else(|| env::var("WOO_SECRET").ok())
        .ok_or("WooCommerce consumer secret not provided".to_string())?;

    // Create basic auth header
    let auth_string = format!("{}:{}", woo_key, woo_secret);
    let auth_header = format!("Basic {}", general_purpose::STANDARD.encode(auth_string));

    // Build the full URL with proper WooCommerce API path
    let base_api_url = if woo_url.ends_with('/') {
        format!("{}wp-json/wc/v3", woo_url)
    } else {
        format!("{}/wp-json/wc/v3", woo_url)
    };
    
    let full_url = format!("{}/{}", base_api_url, request.endpoint.trim_start_matches('/'));
    let client = Client::new();
    
    // SECURITY: Only allow GET requests for read-only operations
    if request.method.to_uppercase() != "GET" {
        return Err("SECURITY VIOLATION: Only GET requests allowed. This app is read-only.".to_string());
    }
    
    let mut req_builder = client.get(&full_url);

    req_builder = req_builder
        .header("Authorization", auth_header)
        .header("Content-Type", "application/json")
        .header("User-Agent", "KR1-App/1.0");
    
    // SECURITY: No data payload allowed for read-only GET requests
    // Data parameter is ignored for security

    let response = req_builder
        .send()
        .await
        .map_err(|e| format!("WooCommerce API request failed: {}", e))?;

    let status = response.status();
    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;
    
    if status.is_success() {
        let data: serde_json::Value = serde_json::from_str(&response_text)
            .map_err(|e| format!("Failed to parse JSON: {}", e))?;
        
        Ok(WooCommerceResponse {
            success: true,
            data: Some(data),
            error: None,
        })
    } else {
        Ok(WooCommerceResponse {
            success: false,
            data: None,
            error: Some(format!("HTTP {}: {}", status, response_text)),
        })
    }
}

// Parse MGW transaction query response
fn parse_mgw_transactions(response_text: &str) -> Result<TransactionSearchResponse, String> {
    // Try to parse as JSON first (modern API response)
    if let Ok(json_data) = serde_json::from_str::<serde_json::Value>(response_text) {
        if let Some(transactions) = json_data.get("transactions").and_then(|t| t.as_array()) {
            return Ok(TransactionSearchResponse {
                success: true,
                transactions: transactions.clone(),
                total: transactions.len() as u32,
                error: None,
            });
        }
    }
    
    // Fallback: parse as URL-encoded response
    let mut transactions = Vec::new();
    let mut success = false;
    let mut error_message = None;
    
    for pair in response_text.split('&') {
        if let Some((key, value)) = pair.split_once('=') {
            let decoded_value = urlencoding::decode(value)
                .map_err(|e| format!("Failed to decode response: {}", e))?
                .into_owned();
            
            match key {
                "response" => {
                    success = decoded_value == "1";
                }
                "responsetext" => {
                    if !success {
                        error_message = Some(decoded_value);
                    }
                }
                "transactions" => {
                    // Parse transaction data if available
                    if let Ok(tx_data) = serde_json::from_str::<Vec<serde_json::Value>>(&decoded_value) {
                        transactions = tx_data;
                    }
                }
                _ => {} // Ignore unknown fields
            }
        }
    }
    
    Ok(TransactionSearchResponse {
        success,
        total: transactions.len() as u32,
        transactions,
        error: error_message,
    })
}

fn main() {
    // Load environment variables at startup
    if dotenvy::from_filename(".env.prod").is_err() {
        dotenv().ok(); // Fallback to regular .env
    }
    
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_mgw_transactions,
            get_woo_orders,
            call_woocommerce_api,
            load_env_credentials,

            store_encryption_key,
            get_encryption_key,
            delete_encryption_key,
            encryption_key_exists,
            save_connected_apps,
            get_connected_apps,
            save_chat_sessions,
            get_chat_sessions,
            save_api_key,
            validate_card
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}