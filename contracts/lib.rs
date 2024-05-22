#[macro_use]
extern crate pbc_contract_codegen;
extern crate pbc_contract_common;

use std::fmt::Write;

use create_type_spec_derive::CreateTypeSpec;
use pbc_contract_common::context::ContractContext;
use pbc_contract_common::events::EventGroup;
use pbc_contract_common::signature::Signature;
use pbc_contract_common::zk::AttestationId;
use pbc_contract_common::zk::{CalculationStatus, SecretVarId, ZkInputDef, ZkState, ZkStateChange, SecretVarMetadata};
use pbc_traits::WriteRPC;
use pbc_zk::{Sbi1, SecretBinary};
use read_write_state_derive::ReadWriteState;

/// Secret variable metadata.
#[derive(ReadWriteState, ReadWriteRPC, Debug)]
#[repr(C)]
pub struct SecretVarType {}

/// Structure representing the open state for the private voting contract.
#[state]
struct ContractState {
    vaults: HashMap<String, Vec<String>>, // Map vaults to members
}

/// Method for initializing the contract's state.
#[init(zk = true)]
fn initialize(_ctx: ContractContext, _zk_state: ZkState<SecretVarMetadata>) -> ContractState {
    ContractState {
        vaults: HashMap::new(), // Initialize with an empty HashMap
    }
}


/// Creates new ZKshare and returns the encryption_key Securly via MPC
#[zk_on_secret_input(shortname = 0x40)]
pub fn new_vault(
    context: ContractContext,
    state: ContractState,
    zk_state: ZkState<SecretVarType>,
    data_hash: String,
    members: Vec<String>
) -> (
    ContractState,
    Vec<EventGroup>,
    ZkInputDef<SecretVarType, Sbi32>,
) {

    // checks for members array
    assert_ne!(members.len(), 0, "Cannot create a vault without members");
    let mut address_set = SortedVecSet::new();
    for mp_address in members.iter() {
      address_set.insert(*mp_address);
    }
    assert_eq!(members.len(), address_set.len(), "Duplicate MP address in input");

    // add vault to state
    state.vaults.insert(data_hash, members);

    // securely return encryption_key and share_id and SecretVarId
    let input_def = ZkInputDef::with_metadata(SecretVarType {});
    (state, vec![], input_def)
}

/// Initializes MPC computation request for the share encryption_key.
#[action(shortname = 0x01, zk = true)]
fn request_access(
    context: ContractContext,
    state: ContractState,
    zk_state: ZkState<SecretVarType>,
    data_hash: String,
    members: Vec<String>
) -> (ContractState, Vec<EventGroup>, Vec<ZkStateChange>) {
    // Return the state unmodified, and no events. Request that the computation begins and define
    // metadata to be attached to the secret output variable.
    (
        state,
        vec![],
        vec![ZkStateChange::start_computation(vec![])],
    )
}

/// Automatically called when the computation is completed
///
/// Once the result has been computed we request that the Zk nodes attest the result (i.e sign it)
/// and save it to this contracts open state.
#[zk_on_compute_complete]
fn validate_signature(
    _context: ContractContext,
    mut state: ContractState,
    zk_state: ZkState<SecretVarMetadata>,
    opened_variables: Vec<SecretVarId>,
) -> (ContractState, Vec<EventGroup>, Vec<ZkStateChange>) {
    
    let mut output: Vec<String> = vec![];
    data_hash
        .rpc_write_to(&mut output)
        .expect("Unable to serialize vote_id");
    output
    
    (
        state,
        vec![],
        vec![ZkStateChange::Attest {
            data_to_attest: output,
        }],
    )
}

/// Automatically called once all nodes have signed the data we requested.
///
/// Get the signatures for the attestation, formats them for EVM, and adds as proof on the result.
#[zk_on_attestation_complete]
fn on_validate_success(
    _context: ContractContext,
    mut state: ContractState,
    zk_state: ZkState<SecretVarMetadata>,
    attestation_id: AttestationId,
) -> (ContractState, Vec<EventGroup>, Vec<ZkStateChange>) {

    // The signatures provided by the computation nodes can be found on the data attestation object
    // in the zk state. Find the attestation that has the same id as the one provided in the
    // arguments.
    let attestation = zk_state
        .data_attestations
        .iter()
        .find(|a| a.attestation_id == attestation_id)
        .unwrap();

    // Parse the signatures into a text format that can be used in an Eth transaction without
    // further data conversions. The format is an array of the signatures in hex encoding.
    let encryption_key = format! {"[{}]", attestation
    .signatures
    .iter()
    .map(as_evm_string)
    .collect::<Vec<String>>()
    .join(", ")};

    
}


/// Encode a [`Signature`] as a hex-string representation of a signature that can be parsed by the
/// EVM.
///
/// To make the signature parseable by the EVM, add 27 to the recovery id. The output should be 64
/// chars of the encoded r value, followed by 64 chars of the encoded s value and finally 2 chars
/// of the encoded recovery id. The entire string is prepended with "0x".
fn as_evm_string(signature: &Signature) -> String {
    // Ethereum expects that the recovery id has value 0x1B or 0x1C, but the algorithm used by PBC
    // outputs 0x00 or 0x01. Add 27 to the recovery id to ensure it has an expected value, and
    // format as a hexidecimal string.
    let recovery_id = signature.recovery_id + 27;
    let recovery_id = format!("{recovery_id:02x}");
    // The r value is 32 bytes, i.e. a string of 64 characters when represented in hexidecimal.
    let mut r = String::with_capacity(64);
    // For each byte in the r value format is a hexidecimal string of length 2 to ensure zero
    // padding, and write it to the output string defined above.
    for byte in signature.value_r {
        write!(r, "{byte:02x}").unwrap();
    }
    // Do the same for the s value.
    let mut s = String::with_capacity(64);
    for byte in signature.value_s {
        write!(s, "{byte:02x}").unwrap();
    }
    // Combine the three values into a single string, prepended with "0x".
    format!("0x{r}{s}{recovery_id}")
}
