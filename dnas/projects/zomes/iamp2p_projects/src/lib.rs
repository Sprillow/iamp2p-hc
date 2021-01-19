use dna_help::{create_receive_signal_cap_grant, fetch_links};
use hdk3::prelude::*;

mod project;

use project::{
    trx::{Trx, TrxSignal, TRX_PATH},
    profile::{Profile, AgentSignal, AGENTS_PATH},
    project_meta::{ProjectMeta, ProjectMetaSignal},
};

#[hdk_extern]
fn init(_: ()) -> ExternResult<InitCallbackResult> {
    create_receive_signal_cap_grant()?;
    Path::from(TRX_PATH).ensure()?;
    Path::from(AGENTS_PATH).ensure()?;
    Ok(InitCallbackResult::Pass)
}

entry_defs!(
    Path::entry_def(),
    Trx::entry_def(),
    ProjectMeta::entry_def(),
    Profile::entry_def()
);

/*
SIGNALS
*/

#[derive(Debug, Serialize, Deserialize, SerializedBytes)]
// untagged because the useful tagging is done internally on the *Signal objects
#[serde(untagged)]
pub enum SignalType {
    Agent(AgentSignal),
    Trx(TrxSignal),
    ProjectMeta(ProjectMetaSignal),
}

pub fn get_peers_latest() -> ExternResult<Vec<AgentPubKey>> {
    get_peers(GetOptions::latest())
}
pub fn get_peers_content() -> ExternResult<Vec<AgentPubKey>> {
    get_peers(GetOptions::content())
}

// used to get addresses of agents to send signals to
// used to get addresses of agents to send signals to
pub fn get_peers(get_options: GetOptions) -> ExternResult<Vec<AgentPubKey>> {
  let path_hash = Path::from(AGENTS_PATH).hash()?;
  let entries = fetch_links::<Profile, Profile>(path_hash, get_options)?;
  let agent_info = agent_info()?;
  Ok(entries
      .into_iter()
      // eliminate yourself as a peer
      .filter(|x| x.address.0 != agent_info.agent_initial_pubkey)
      .map(|x| AgentPubKey::from(x))
      .collect::<Vec<AgentPubKey>>())
}

// receiver (and forward to UI)
#[hdk_extern]
pub fn recv_remote_signal(sb: SerializedBytes) -> ExternResult<()> {
    let signal: SignalType = SignalType::try_from(sb)?;
    let _ = debug!(format!("RECEIVED SIGNAL: {:?}", signal));
    Ok(emit_signal(&signal)?)
}
