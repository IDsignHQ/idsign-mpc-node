#![allow(unused_variables)]
#![allow(private_interfaces)]
 
#[macro_use]
extern crate pbc_contract_codegen;
extern crate pbc_contract_common;
extern crate pbc_lib;

use create_type_spec_derive::CreateTypeSpec;
use num_bigint::BigUint;
use pbc_contract_common::address::Address;
use pbc_contract_common::context::ContractContext;
use pbc_contract_common::events::EventGroup;
use pbc_contract_common::zk::{SecretVarId, ZkInputDef, ZkState};
use pbc_zk::Sbi32;
use read_write_state_derive::ReadWriteState;
use read_write_rpc_derive::{ReadRPC, WriteRPC};

#[derive(ReadWriteState, ReadRPC, WriteRPC, Debug)]
struct SecretVarMetadata {
    key: u32,
}

#[derive(ReadWriteState, CreateTypeSpec)]
struct PublicKey {
    n: Vec<u8>,  // modulus
    e: Vec<u8>,  // public exponent
}
 
#[derive(Clone, ReadWriteState, CreateTypeSpec)]
struct Vault {
    owner: Address,
    acls: Vec<Address>,
}
 
#[state]
struct ContractState {
    owner: Address,
    vaults: Vec<Vault>,
}

#[init(zk = true)]
fn initialize(context: ContractContext, zk_state: ZkState<SecretVarMetadata>) -> ContractState {
    ContractState {
        owner: context.sender,
        vaults: Vec::new(),
    }
}

#[zk_on_secret_input(shortname = 0x30)]
fn create_vault(
    context: ContractContext,
    mut state: ContractState,
    zk_state: ZkState<SecretVarMetadata>,
    key: u32,
    owner: Address,
    acls: Vec<Address>,
) -> (ContractState, Vec<EventGroup>, ZkInputDef<SecretVarMetadata, Sbi32>) {
 
    state.vaults.push(Vault {owner,acls});

    let input_def = ZkInputDef::with_metadata(
        None,
        SecretVarMetadata {
            key,
        },
    );


    (state, vec![], input_def)
}

#[action(shortname = 0x03, zk = true)]
pub fn read_vault(
    context: ContractContext,
    state: ContractState,
    zk_state: ZkState<SecretVarMetadata>,
    vault_index: u32,
    key_index: SecretVarId,
    n: Vec<u8>,
    e: Vec<u8>,
) -> ContractState {
    // Authorization check
    let vault = &state.vaults[vault_index as usize];
    if !vault.acls.contains(&context.sender) {
        panic!("404 UNAUTHORIZED: {:?} is not authorized to access this vault", context.sender);
    }

    // Retrieve the key from zk_state
    let sum_variable = zk_state.get_variable(key_index).unwrap();
    let mut buffer = [0u8; 4];
    buffer.copy_from_slice(sum_variable.data.as_ref().unwrap().as_slice());
    let key = u32::from_le_bytes(buffer).to_string();
    // Convert public key components from big-endian byte arrays to BigUint
    let n = BigUint::from_bytes_be(&n);
    let e = BigUint::from_bytes_be(&e);

    // Convert data to BigUint
    let m = BigUint::from_bytes_be(&key.as_bytes());

    // Perform encryption: c = m^e mod n
    let c = m.modpow(&e, &n);

    // Convert result back to bytes
    let encrypted_data = c.to_bytes_be();

    state
}
