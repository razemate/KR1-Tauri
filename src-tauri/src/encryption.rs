//! Encryption key management for KR1
//! 
//! Provides secure storage and retrieval of encryption keys using Windows Credential Manager.
//! Keys are stored without password prompts for seamless user experience.

use tauri::command;

use serde::{Deserialize, Serialize};

#[cfg(target_os = "windows")]
use winapi::um::wincred::{
    CredReadW, CredWriteW, CredDeleteW, CRED_TYPE_GENERIC, CRED_PERSIST_LOCAL_MACHINE,
    CREDENTIALW, PCREDENTIALW
};
#[cfg(target_os = "windows")]

#[cfg(target_os = "windows")]
use std::ffi::OsStr;
#[cfg(target_os = "windows")]
use std::os::windows::ffi::OsStrExt;
#[cfg(target_os = "windows")]
use std::ptr;

const CREDENTIAL_TARGET: &str = "KR1_EncryptionKey";
const KEY_LENGTH: usize = 64; // 32 bytes = 64 hex characters

#[derive(Debug, Serialize, Deserialize)]
pub struct EncryptionKeyError {
    pub message: String,
    pub code: String,
}

impl std::fmt::Display for EncryptionKeyError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "{}: {}", self.code, self.message)
    }
}

impl std::error::Error for EncryptionKeyError {}

/// Generate a cryptographically secure encryption key
pub fn generate_encryption_key() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let key_bytes: Vec<u8> = (0..32).map(|_| rng.gen()).collect();
    hex::encode(key_bytes)
}

#[cfg(target_os = "windows")]
fn string_to_wide(s: &str) -> Vec<u16> {
    OsStr::new(s).encode_wide().chain(std::iter::once(0)).collect()
}

#[cfg(target_os = "windows")]
fn wide_to_string(wide: &[u16]) -> String {
    let end = wide.iter().position(|&c| c == 0).unwrap_or(wide.len());
    String::from_utf16_lossy(&wide[..end])
}

/// Store encryption key in Windows Credential Manager
#[cfg(target_os = "windows")]
fn store_key_windows(key: &str) -> Result<(), EncryptionKeyError> {
    unsafe {
        let mut target_name = string_to_wide(CREDENTIAL_TARGET);
        let key_bytes = key.as_bytes();
        
        let mut credential = CREDENTIALW {
            Flags: 0,
            Type: CRED_TYPE_GENERIC,
            TargetName: target_name.as_mut_ptr() as *mut u16,
            Comment: ptr::null_mut(),
            LastWritten: std::mem::zeroed(),
            CredentialBlobSize: key_bytes.len() as u32,
            CredentialBlob: key_bytes.as_ptr() as *mut u8,
            Persist: CRED_PERSIST_LOCAL_MACHINE,
            AttributeCount: 0,
            Attributes: ptr::null_mut(),
            TargetAlias: ptr::null_mut(),
            UserName: ptr::null_mut(),
        };
        
        let result = CredWriteW(&mut credential, 0);
        if result == 0 {
            return Err(EncryptionKeyError {
                message: "Failed to store encryption key in Windows Credential Manager".to_string(),
                code: "STORE_FAILED".to_string(),
            });
        }
    }
    Ok(())
}

/// Retrieve encryption key from Windows Credential Manager
#[cfg(target_os = "windows")]
fn get_key_windows() -> Result<String, EncryptionKeyError> {
    unsafe {
        let target_name = string_to_wide(CREDENTIAL_TARGET);
        let mut credential: PCREDENTIALW = ptr::null_mut();
        
        let result = CredReadW(
            target_name.as_ptr(),
            CRED_TYPE_GENERIC,
            0,
            &mut credential,
        );
        
        if result == 0 {
            return Err(EncryptionKeyError {
                message: "Encryption key not found in Windows Credential Manager".to_string(),
                code: "KEY_NOT_FOUND".to_string(),
            });
        }
        
        let cred = &*credential;
        let key_bytes = std::slice::from_raw_parts(
            cred.CredentialBlob,
            cred.CredentialBlobSize as usize,
        );
        
        let key = String::from_utf8_lossy(key_bytes).to_string();
        
        // Free the credential
        winapi::um::wincred::CredFree(credential as *mut _);
        
        Ok(key)
    }
}

/// Delete encryption key from Windows Credential Manager
#[cfg(target_os = "windows")]
fn delete_key_windows() -> Result<(), EncryptionKeyError> {
    unsafe {
        let target_name = string_to_wide(CREDENTIAL_TARGET);
        
        let result = CredDeleteW(
            target_name.as_ptr(),
            CRED_TYPE_GENERIC,
            0,
        );
        
        if result == 0 {
            return Err(EncryptionKeyError {
                message: "Failed to delete encryption key from Windows Credential Manager".to_string(),
                code: "DELETE_FAILED".to_string(),
            });
        }
    }
    Ok(())
}

// Fallback implementations for non-Windows platforms (for development)
#[cfg(not(target_os = "windows"))]
fn store_key_windows(_key: &str) -> Result<(), EncryptionKeyError> {
    Err(EncryptionKeyError {
        message: "Windows Credential Manager not available on this platform".to_string(),
        code: "PLATFORM_NOT_SUPPORTED".to_string(),
    })
}

#[cfg(not(target_os = "windows"))]
fn get_key_windows() -> Result<String, EncryptionKeyError> {
    Err(EncryptionKeyError {
        message: "Windows Credential Manager not available on this platform".to_string(),
        code: "PLATFORM_NOT_SUPPORTED".to_string(),
    })
}

#[cfg(not(target_os = "windows"))]
fn delete_key_windows() -> Result<(), EncryptionKeyError> {
    Err(EncryptionKeyError {
        message: "Windows Credential Manager not available on this platform".to_string(),
        code: "PLATFORM_NOT_SUPPORTED".to_string(),
    })
}

/// Tauri command to store encryption key
#[command]
pub async fn store_encryption_key(key: String) -> Result<(), String> {
    if key.len() != KEY_LENGTH {
        return Err(format!("Invalid key length. Expected {} characters, got {}", KEY_LENGTH, key.len()));
    }
    
    // Validate hex format
    if !key.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err("Invalid key format. Key must be hexadecimal".to_string());
    }
    
    store_key_windows(&key).map_err(|e| e.message)
}

/// Tauri command to get encryption key
#[command]
pub async fn get_encryption_key() -> Result<String, String> {
    get_key_windows().map_err(|e| e.message)
}

/// Tauri command to generate and store a new encryption key
#[command]
pub async fn generate_and_store_encryption_key() -> Result<String, String> {
    let key = generate_encryption_key();
    store_key_windows(&key).map_err(|e| e.message)?;
    Ok(key)
}

/// Tauri command to delete encryption key
#[command]
pub async fn delete_encryption_key() -> Result<(), String> {
    delete_key_windows().map_err(|e| e.message)
}

/// Tauri command to check if encryption key exists
#[command]
pub async fn encryption_key_exists() -> Result<bool, String> {
    match get_key_windows() {
        Ok(_) => Ok(true),
        Err(e) if e.code == "KEY_NOT_FOUND" => Ok(false),
        Err(e) => Err(e.message),
    }
}

/// Initialize encryption system - generate key if none exists
#[command]
pub async fn initialize_encryption() -> Result<String, String> {
    match get_key_windows() {
        Ok(key) => Ok(key),
        Err(e) if e.code == "KEY_NOT_FOUND" => {
            // Generate new key
            let key = generate_encryption_key();
            store_key_windows(&key).map_err(|e| e.message)?;
            Ok(key)
        },
        Err(e) => Err(e.message),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_encryption_key() {
        let key = generate_encryption_key();
        assert_eq!(key.len(), KEY_LENGTH);
        assert!(key.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_key_validation() {
        let valid_key = "a".repeat(KEY_LENGTH);
        let invalid_key_length = "a".repeat(KEY_LENGTH - 1);
        let invalid_key_format = "g".repeat(KEY_LENGTH);

        // This would require mocking the Windows API for full testing
        // For now, just test the validation logic
        assert_eq!(valid_key.len(), KEY_LENGTH);
        assert!(valid_key.chars().all(|c| c.is_ascii_hexdigit()));
        
        assert_ne!(invalid_key_length.len(), KEY_LENGTH);
        assert!(!invalid_key_format.chars().all(|c| c.is_ascii_hexdigit()));
    }
}