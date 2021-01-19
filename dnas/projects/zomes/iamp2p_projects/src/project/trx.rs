use crate::{get_peers_latest, SignalType};
use dna_help::{
    fetch_links, signal_peers, ActionType, EntryAndHash, WrappedAgentPubKey, WrappedEntryHash,
    WrappedHeaderHash,
};
use hdk3::prelude::*;

#[hdk_entry(id = "trx")]
#[derive(Debug, Clone, PartialEq)]
pub struct Trx {
    pub from: WrappedAgentPubKey,
    pub to: WrappedAgentPubKey,
    pub created_at: f64,
    pub amount: f64,
}

fn convert_to_receiver_signal(signal: TrxSignal) -> SignalType {
    SignalType::Trx(signal)
}

pub const TRX_PATH: &str = "TRX_PATH";

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, SerializedBytes)]
pub struct TrxWireEntry {
    pub entry: Trx,
    pub address: WrappedHeaderHash,
    pub entry_address: WrappedEntryHash,
}

// this will be used to send these data structures as signals to the UI
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, SerializedBytes)]
// untagged because the useful tagging is done externally on the *Signal object
// as the tag and action
#[serde(untagged)]
pub enum TrxSignalData {
    Create(TrxWireEntry),
}

// this will be used to send these data structures as signals to the UI
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, SerializedBytes)]
pub struct TrxSignal {
    pub entry_type: String,
    pub action: ActionType,
    pub data: TrxSignalData,
}

impl From<EntryAndHash<Trx>> for TrxWireEntry {
    fn from(entry_and_hash: EntryAndHash<Trx>) -> Self {
        TrxWireEntry {
            entry: entry_and_hash.0,
            address: WrappedHeaderHash(entry_and_hash.1),
            entry_address: WrappedEntryHash(entry_and_hash.2),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, SerializedBytes)]
pub struct VecTrxWireEntry(pub Vec<TrxWireEntry>);

/*
  CREATE
*/
pub fn inner_create_trx(entry: Trx, send_signal: bool) -> ExternResult<TrxWireEntry> {
    let address = create_entry(&entry)?;
    let entry_hash = hash_entry(&entry)?;
    let path = Path::from(TRX_PATH);
    path.ensure()?;
    let path_hash = path.hash()?;
    create_link(path_hash, entry_hash.clone(), ())?;
    let wire_entry = TrxWireEntry {
        entry,
        address: WrappedHeaderHash(address),
        entry_address: WrappedEntryHash(entry_hash),
    };
    if send_signal {
        let signal = convert_to_receiver_signal(TrxSignal {
            entry_type: "trx".to_string(),
            action: ActionType::Create,
            data: TrxSignalData::Create(wire_entry.clone()),
        });
        let _ = debug!(format!("CREATE ACTION SIGNAL PEERS {:?}", signal));
        let _ = signal_peers(&signal, get_peers_latest);
    }
    Ok(wire_entry)
}

#[hdk_extern]
pub fn create_trx(entry: Trx) -> ExternResult<TrxWireEntry> {
    inner_create_trx(entry, true)
}

/*
  READ
*/
pub fn inner_fetch_trxs(get_options: GetOptions) -> ExternResult<VecTrxWireEntry> {
    let path_hash = Path::from(TRX_PATH).hash()?;
    let entries = fetch_links::<Trx, TrxWireEntry>(path_hash, get_options)?;
    Ok(VecTrxWireEntry(entries))
}

#[hdk_extern]
pub fn fetch_trxs(_: ()) -> ExternResult<VecTrxWireEntry> {
    inner_fetch_trxs(GetOptions::latest())
}
