use dna_help::{
    fetch_links, ActionType, EntryAndHash, WrappedAgentPubKey, WrappedEntryHash, WrappedHeaderHash,
};
use hdk3::prelude::*;

#[hdk_entry(id = "project_meta")]
#[derive(Debug, Clone, PartialEq)]
pub struct ProjectMeta {
    pub creator_address: WrappedAgentPubKey,
    pub created_at: f64,
    pub passphrase: String,
}

pub const PROJECT_META_PATH: &str = "PROJECT_META_PATH";

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, SerializedBytes)]
pub struct ProjectMetaWireEntry {
    pub entry: ProjectMeta,
    pub address: WrappedHeaderHash,
    pub entry_address: WrappedEntryHash,
}

// this will be used to send these data structures as signals to the UI
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, SerializedBytes)]
// untagged because the useful tagging is done externally on the *Signal object
// as the tag and action
#[serde(untagged)]
pub enum ProjectMetaSignalData {
    Create(ProjectMetaWireEntry),
}

// this will be used to send these data structures as signals to the UI
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, SerializedBytes)]
pub struct ProjectMetaSignal {
    pub entry_type: String,
    pub action: ActionType,
    pub data: ProjectMetaSignalData,
}

impl From<EntryAndHash<ProjectMeta>> for ProjectMetaWireEntry {
    fn from(entry_and_hash: EntryAndHash<ProjectMeta>) -> Self {
        ProjectMetaWireEntry {
            entry: entry_and_hash.0,
            address: WrappedHeaderHash(entry_and_hash.1),
            entry_address: WrappedEntryHash(entry_and_hash.2),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, SerializedBytes)]
pub struct VecProjectMetaWireEntry(pub Vec<ProjectMetaWireEntry>);

/*
  CREATE
*/
pub fn inner_create_project_meta(entry: ProjectMeta) -> ExternResult<ProjectMetaWireEntry> {
    let address = create_entry(&entry)?;
    let entry_hash = hash_entry(&entry)?;
    let path = Path::from(PROJECT_META_PATH);
    path.ensure()?;
    let path_hash = path.hash()?;
    create_link(path_hash, entry_hash.clone(), ())?;
    let wire_entry = ProjectMetaWireEntry {
        entry,
        address: WrappedHeaderHash(address),
        entry_address: WrappedEntryHash(entry_hash),
    };
    Ok(wire_entry)
}

#[hdk_extern]
pub fn create_project_meta(entry: ProjectMeta) -> ExternResult<ProjectMetaWireEntry> {
    inner_create_project_meta(entry)
}

/*
  READ
*/
pub fn inner_fetch_project_metas(get_options: GetOptions) -> ExternResult<VecProjectMetaWireEntry> {
    let path_hash = Path::from(PROJECT_META_PATH).hash()?;
    let entries = fetch_links::<ProjectMeta, ProjectMetaWireEntry>(path_hash, get_options)?;
    Ok(VecProjectMetaWireEntry(entries))
}

// READ
#[hdk_extern]
pub fn fetch_project_meta(_: ()) -> ExternResult<ProjectMetaWireEntry> {
    match inner_fetch_project_metas(GetOptions::latest())?.0.first() {
        Some(wire_entry) => Ok(wire_entry.to_owned()),
        None => Err(HdkError::Wasm(WasmError::Zome(
            "no project meta exists".into(),
        ))),
    }
}
