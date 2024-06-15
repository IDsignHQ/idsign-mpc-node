/*!
 * @project zk_vaults
 * @file lib.rs
 * @author 
 *      @Jeanclaudeaoun <jc@idsign.com | jeanclaude.aoun@hotmail.com>
 *      idSign Inc.
 * 
 * @brief 
 *      This Rust library implements a secure vault system on the Partisia Blockchain 
 *      using zero-knowledge, MPC and encryption. It allows users to create 
 *      and manage vaults, ensuring that secret keys can only be accessed by 
 *      authorized users and are securely transmitted using RSA encryption.
 * 
 * @license
 *      BSD-1
 *      "../LICENSE.md"
 */

 #![allow(unused_variables)]
 #![allow(private_interfaces)]
 
 #[macro_use]
 extern crate pbc_contract_codegen;
 extern crate pbc_contract_common;
 extern crate pbc_lib;
 
 use rsa::{Pkcs1v15Encrypt, RsaPublicKey};
 use create_type_spec_derive::CreateTypeSpec;
 use pbc_contract_common::address::Address;
 use pbc_contract_common::context::ContractContext;
 use pbc_contract_common::events::EventGroup;
 use pbc_contract_common::zk::{SecretVarId, ZkInputDef, ZkState};
 use read_write_state_derive::ReadWriteState;
 
 /// The `Vault` struct in Rust represents a secure storage container with an owner and a list of
 /// authorized access addresses.
 /// 
 /// Properties:
 /// 
 /// * `owner`: The `owner` property in the `Vault` struct represents the address of the owner of the
 /// Vault. This address is used to identify the individual or entity that has control over the Vault and
 /// its contents.
 /// * `acls`: The `acls` property in the `Vault` struct represents an array of addresses that can access
 /// the Vault secret key. This allows multiple addresses to be granted access to the Vault's secret key
 /// for secure management and sharing of sensitive information.
 #[derive(Clone, ReadWriteState, CreateTypeSpec)]
 struct Vault {
     /// Owner of the Vault
     owner: Address,
     /// Array of addresses that can access the Vault secret key
     acls: Vec<Address>,
 }
 
 /// Represents a contract state with an owner address and a vector of
 /// vaults.
 /// 
 /// Properties:
 /// 
 /// * `owner`: The `owner` property in the `ContractState` struct represents the address of the owner of
 /// the contract. This address is typically used to identify the entity that has special privileges or
 /// control over the contract's functionality and data.
 /// * `vaults`: The `vaults` property in the `ContractState` struct is a vector of `Vault` structs. It
 /// represents a collection of vaults associated with the contract. Each `Vault` struct likely contains
 /// information about a specific vault, such as its ID, balance, owner, or any other relevant
 #[state]
 struct ContractState {
     /// Owner of the contract
     owner: Address,
     /// map vault_id -> Vault
     vaults: Vec<Vault>,
 }
 
 /// The `initialize` function initializes a contract and sets the owner to the sender.
 /// 
 /// Arguments:
 /// 
 /// * `context`: The `context` parameter in the `initialize` function represents the context in which
 /// the contract is being initialized. It typically includes information such as the sender of the
 /// transaction, the current block number, and other relevant details about the transaction.
 /// * `zk_state`: The `zk_state` parameter in the `initialize` function is of type `ZkState<u32>`. This
 /// indicates that it is a zero-knowledge state variable that stores an unsigned 32-bit integer value.
 /// It can be used to securely store and manage sensitive data while preserving privacy and
 /// confidentiality
 /// 
 /// Returns:
 /// 
 /// A `ContractState` struct is being returned, with the `owner` field set to the sender of the context
 /// and the `vaults` field initialized as an empty vector.
 #[init(zk = true)]
 fn initialize(context: ContractContext, zk_state: ZkState<u32>) -> ContractState {
     ContractState {
         owner: context.sender,
         vaults: Vec::new(),
     }
 }
 
 /// The function `create_vault` creates a new vault with specified key, owner, and access control list,
 /// and returns the updated contract state, event groups, and zk input definition.
 /// 
 /// Arguments:
 ///
 /// * `key`: The `key` parameter in the `create_vault` function is of type `i128` and represents a
 /// cryptographic key used for securing the vault.
 /// * `owner`: The `owner` parameter in the `create_vault` function represents the address of the owner
 /// of the vault being created. This address will have special permissions and control over the vault's
 /// operations and contents.
 /// * `acls`: The `acls` parameter in the `create_vault` function represents a vector of addresses.
 /// These addresses are used to specify the access control list for the vault being created. The `owner`
 /// address has full control over the vault, while the addresses in the `acls` vector may have
 #[zk_on_secret_input(shortname = 0x30)]
 fn create_vault(
     context: ContractContext,
     mut state: ContractState,
     zk_state: ZkState<i32>,
     key: i128,
     owner: Address,
     acls: Vec<Address>,
 ) -> (
     ContractState,
     Vec<EventGroup>,
     ZkInputDef<i128>,
 ) {
 
     let def = ZkInputDef {
         seal: false,
         expected_bit_lengths: vec![10, 10],
         metadata: key,
     };
 
     state
     .vaults
     .push(Vault {owner,acls});
 
     (state, vec![], def)
 }
 
 /// The `read_vault` function in Rust reads a vault using zero-knowledge proof and returns the key encrypted using RSA.
 /// 
 /// Arguments:
 /// 
 /// * `vault_index`: The `vault_index` parameter is an `i32` value representing the index of the vault
 /// within the `state` object that you want to access.
 /// * `key_index`: The `key_index` parameter in the `read_vault` function is of type `SecretVarId`. It
 /// is used to identify a specific secret variable within the `zk_state` (Zero-Knowledge State) data
 /// structure. This variable is then retrieved from the `zk_state` using the `
 /// * `pub_pem`: The `pub_pem` parameter in the `read_vault` function is of type `RsaPublicKey`. This
 /// parameter represents the RSA public key used for encryption in the function.
 pub fn read_vault(
     context: ContractContext,
     state: ContractState,
     zk_state: ZkState<i128>,
     vault_index: i32,
     key_index: SecretVarId,
     pub_pem: RsaPublicKey,
 ) -> (
     ContractState,
     Vec<u8>,
 ) {
     // TODO: zk attest
     let vault = state
         .vaults[vault_index as usize]
         .acls
         .iter()
         .find(|x| **x == context.sender);
 
     let vault: &Address = match vault {
         Some(vault) => vault,
         None => panic!("404 UNAUTHORIZED: {:?} is not authorized to access this vault", context.sender),
     };
 
     let variable = zk_state.get_variable(key_index).unwrap();
     let mut buffer = [0u8; 16];
     buffer.copy_from_slice(variable.data.as_ref().unwrap().as_slice());
     let key = <i128>::from_le_bytes(buffer).to_string();
 
     let data = key.as_bytes();
     let mut rng = rand::thread_rng();
     let bits = 2048;
     let enc_data = pub_pem.encrypt(&mut rng, Pkcs1v15Encrypt, &data[..]).expect("failed to encrypt");
 
     (state, enc_data)
 }