#[macro_use]
extern crate pbc_contract_codegen;
extern crate pbc_contract_common;

use create_type_spec_derive::CreateTypeSpec;
use pbc_contract_common::address::Address;
use pbc_contract_common::context::ContractContext;
use pbc_contract_common::events::EventGroup;
use pbc_contract_common::zk::{CalculationStatus, SecretVarId, ZkInputDef, ZkState, ZkStateChange};
use read_write_state_derive::ReadWriteState;
use pbc_zk::{Sbi32, load_sbi, secret_variable_ids, zk_compute};

/// Secret variable metadata. Indicates if the variable is a vote or the number of counted yes votes
#[derive(ReadWriteState, Debug)]
#[repr(C)]
struct SecretVarMetadata {
    _id: u128,
    _shares: Vec<u128>,
}

#[derive(ReadWriteState, CreateTypeSpec, Clone)]
struct AccessToken {
    issued_at: Date,
    accesstoken: String,
}

/// This contract's state
#[state]
struct ContractState {
    _accesstoken: Option<AccessToken>,
    _vaults: SortedVecSet<u128, SortedVecSet<Address, Bool>>,
}


#[init(zk = true)]
fn initialize( ctx: ContractContext, _zk_state: ZkState<SecretVarMetadata> ) -> ContractState {
    ContractState {
        _accesstoken: None,
        _vaults: SortedVecSet::new()
    }
}

/// creates new vault
#[zk_on_secret_input(shortname = 0x40)]
fn new_zk_vault(
    ctx: ContractContext,
    state: ContractState,
    zk_state: ZkState<SecretVarMetadata>,
    _id: u128,
    _k: String,
    _members: Vec<Address>,
) -> (
    ContractState,
    Vec<EventGroup>,
    ZkInputDef<SecretVarMetadata, Sbi32>,
) {
    // checks for members array
    assert_ne!(_members.len(), 0, "Cannot create a vault without members");
    let mut _acls = SortedVecSet::new();
    for usr_address in _members.iter() {
        _acls.insert(&usr_address, true)
    }
    assert_eq!(_members.len(), _acls.len(), "Duplicate address in input");

    // split key into shares using sss
    let mut s = create_shares(&_k, 4, 3).unwrap();
    state._vaults.insert(_id,_acls)

    (
        state, 
        vec![], 
        ZkInputDef::with_metadata(SecretVarMetadata {
            _id,
            _shares: s,
        })
    )
}


/// Initializes MPC computation request for the vault.
#[action(shortname = 0x01, zk = true)]
fn zk_vault_get_keys(
    _context: ContractContext,
    state: ContractState,
    zk_state: ZkState<SecretVarMetadata>,
    _id: u128,
    _sig: String
) -> (ContractState, Vec<EventGroup>, Vec<ZkStateChange>) {
    assert_eq!(
        zk_state.calculation_state,
        CalculationStatus::Waiting,
        "BUSY",
    );
    assert_eq!(
        state._acls.get(&id).clone().get(ctx.sender),
        true,
        "401_UNAUTHORIZED",
    );

    (
        state,
        vec![],
        vec![ZkStateChange::start_computation(vec![SecretVarMetadata { _id }])],
    )
}

#[zk_on_compute_complete]
fn on_authorized(
    _ctx: ContractContext,
    state: ContractState,
    _zk_state: ZkState<SecretVarMetadata>,
    output_variables: Vec<SecretVarId>,
) -> (ContractState, Vec<EventGroup>, Vec<ZkStateChange>) {



    let _sv = load_sbi::<Sbi128>(output_variables[0])
    

    let mut data_to_attest: Vec<u8> = vec![];
    _sv._shares[0]
        .rpc_write_to(&mut data_to_attest)
        .expect("Unable to serialize share 0");
    _sv._shares[1]
        .rpc_write_to(&mut data_to_attest)
        .expect("Unable to serialize share 0");
    _sv._shares[3]
        .rpc_write_to(&mut data_to_attest)
        .expect("Unable to serialize share 0");
    data_to_attest

    (
        state,
        vec![],
        vec![ZkStateChange::Attest {
            data_to_attest,
        }],
    )
}


#[zk_on_attestation_complete]
fn save_attestation_on_result_and_start_next_vote(
    _context: ContractContext,
    mut state: ContractState,
    zk_state: ZkState<SecretVarMetadata>,
    attestation_id: AttestationId,
) -> (ContractState, Vec<EventGroup>, Vec<ZkStateChange>) {

    let attestation = zk_state
        .data_attestations
        .iter()
        .find(|a| a.attestation_id == attestation_id)
        .unwrap();

    // Parse the signatures into a text format that can be used in an Eth transaction without
    // further data conversions. The format is an array of the signatures in hex encoding.
    let proof_of_result = format! {"[{}]", attestation
    .signatures
    .iter()
    .map(as_evm_string)
    .collect::<Vec<String>>()
    .join(", ")};

    // Save the proof on the result object for convenient retrieval.
    result.proof = Some(proof_of_result);
    (
        state,
        vec![],
        vec![],
    )
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
