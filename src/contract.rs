extern crate pbc_contract_codegen;
extern crate pbc_contract_common;

use pbc_contract_common::context::ContractContext;
use pbc_contract_common::zk::{ZkInputDef, ZkState};
use pbc_contract_common::crypto::secp256k1::Secp256k1;
use pbc_contract_common::crypto::aes::{Aes256, NewCipher, generic_array::GenericArray};
use std::collections::HashMap;
use pbc_zk::{Sbi64, PublicKey, SecretBinary};
use serde::{Serialize, Deserialize};
use pbc_zk::{Sbi64, PublicKey, SecretBinary, store_sbi, store_metadata};
use crypto::sign; // Placeholder for actual cryptographic signing library

/// Structure for storing encrypted secrets and the list of authorized addresses
#[derive(Serialize, Deserialize)]
pub struct Vault {
    owner: PublicKey,
    members: Vec<PublicKey>,
}

#[state]
struct ContractState {
    vaults: HashMap<u32, Vault>,
}

/// Initialize the contract state
#[init]
fn initialize(ctx: ContractContext) -> ContractState {
    ContractState {
      vaults: HashMap::new(),
    }
}



/// Sets up a new vault with a secret-shared AES key and stores it securely.
///
/// ### Arguments:
///
/// * `unique_id` - Unique identifier for the vault.
/// * `members` - A vector of public keys representing the members who can access the vault.
///
/// ### Returns:
///
/// A cryptographic signature of the vault ID.
#[zk_on_secret_input]
pub fn set(unique_id: i32, members: Vec<PublicKey>) -> String {
    let aes_key_parts = split_aes_key(); // Simulate splitting AES key into three parts
    let owner = get_public_key(); // Assume this retrieves the public key of the caller

    // Store the parts of the vault as secret-shared data and metadata
    let id_base = generate_id_base(unique_id); // Generate a base ID for storage
    
    store_metadata::<PublicKey>(id_base, owner);
    store_sbi::<Sbi64>(id_base + 1, aes_key_parts.0);
    store_sbi::<Sbi64>(id_base + 2, aes_key_parts.1);
    store_sbi::<Sbi64>(id_base + 3, aes_key_parts.2);
    store_metadata::<Vec<PublicKey>>(id_base + 4, members);

    // Generate a cryptographic signature for the vault ID
    let combined_aes_key = combine_secret_parts(vault.secret_part_1, vault.secret_part_2, vault.secret_part_3);
    Ok(combined_aes_key)
}

#[zk_on_compute_complete]
pub fn get(vault_id: i32, siwe_signature: String) -> Result<Sbi64, &'static str> {
    let address = verify_siwe_signature(siwe_signature)?;
    let salt = request_salt_from_server(address)?;

    let vault = load_vault(vault_id);
    if vault.members.contains(&address) {
        let combined_aes_key = combine_secret_parts(vault.secret_part_1, vault.secret_part_2, vault.secret_part_3);
        Ok(combined_aes_key)
    } else {
        Err("Access Denied")
    }
}

pub fn load_vault(vault_id: i32) -> Result<Vault, &'static str> {
    // Search for vault matching vault_id
    let ids = secret_variable_ids();
    for id in ids {
        let current_id = load_metadata::<i32>(id);
        if current_id == Ok(vault_id) {
            // Load the secret parts and public data
            let owner = load_metadata::<PublicKey>(id);
            let secret_part_1 = load_sbi::<Sbi64>(id);
            let secret_part_2 = load_sbi::<Sbi64>(id + 1);
            let secret_part_3 = load_sbi::<Sbi64>(id + 2);
            let members = load_metadata::<Vec<PublicKey>>(id + 3);
            
            return Ok(Vault {
                owner,
                secret_part_1,
                secret_part_2,
                secret_part_3,
                members,
            });
        }
    }
    Err("Vault not found")
}


fn split_aes_key() -> (Sbi64, Sbi64, Sbi64) {
    // Placeholder: logic to split AES key into three parts
    (Sbi64::from(123), Sbi64::from(456), Sbi64::from(789))
}


fn verify_siwe_signature(signature: String) -> Result<PublicKey, &'static str> {
    // Placeholder: logic to verify SIWE signature
    Ok(PublicKey::new())
}

fn request_salt_from_server(wallet_address: PublicKey) -> Result<i64, &'static str> {
    // Placeholder: logic to request salt
    Ok(123456)
}

fn combine_secret_parts(part1: Sbi64, part2: Sbi64, part3: Sbi64) -> Sbi64 {
    part1 + part2 + part3 // Simplified, should be SSS
}
