use dna_help::{
    fetch_links, get_latest_for_entry, signal_peers, ActionType, EntryAndHash, WrappedAgentPubKey,
    WrappedHeaderHash,
};
use hdk3::prelude::*;

use crate::get_peers_latest;

pub const AGENTS_PATH: &str = "agents";

#[hdk_entry(id = "profile")]
#[derive(Debug, Clone, PartialEq)]
pub struct Profile {
    created_at: f64,
    handle: String,
    avatar_url: String,
    pub address: WrappedAgentPubKey,
}

impl From<Profile> for AgentPubKey {
    fn from(profile: Profile) -> Self {
        profile.address.0
    }
}

impl From<EntryAndHash<Profile>> for Profile {
    fn from(entry_and_hash: EntryAndHash<Profile>) -> Self {
        entry_and_hash.0
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, SerializedBytes)]
pub struct WireEntry {
    pub entry: Profile,
    pub address: WrappedHeaderHash,
}

impl From<EntryAndHash<Profile>> for WireEntry {
    fn from(entry_and_hash: EntryAndHash<Profile>) -> Self {
        WireEntry {
            entry: entry_and_hash.0,
            address: WrappedHeaderHash(entry_and_hash.1),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, SerializedBytes)]
pub struct AgentsOutput(Vec<Profile>);

#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone, PartialEq)]
pub struct WhoAmIOutput(Option<WireEntry>);

#[derive(SerializedBytes, Debug, Clone, PartialEq)]
pub enum Status {
    Online,
    Away,
    Offline,
}
impl From<String> for Status {
    fn from(s: String) -> Self {
        match s.as_str() {
            "Online" => Self::Online,
            "Away" => Self::Away,
            // hack, should be explicit about Offline
            _ => Self::Offline,
        }
    }
}
// for some reason
// default serialization was giving (in json), e.g.
/*
{
  Online: null
}
we just want it Status::Online to serialize to "Online",
so I guess we have to write our own?
*/
impl Serialize for Status {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(match *self {
            Status::Online => "Online",
            Status::Away => "Away",
            Status::Offline => "Offline",
        })
    }
}
impl<'de> Deserialize<'de> for Status {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        match s.as_str() {
            "Online" => Ok(Status::Online),
            "Away" => Ok(Status::Away),
            // hack, should be "Offline"
            _ => Ok(Status::Offline),
        }
    }
}

#[hdk_extern]
pub fn create_whoami(entry: Profile) -> ExternResult<WireEntry> {
    // commit this new profile
    let header_hash = create_entry(&entry)?;

    let entry_hash = hash_entry(&entry)?;

    // list me so anyone can see my profile
    let agents_path_address = Path::from(AGENTS_PATH).hash()?;
    create_link(agents_path_address, entry_hash.clone(), ())?;

    // list me so I can specifically and quickly look up my profile
    let agent_pubkey = agent_info()?.agent_initial_pubkey;
    let agent_entry_hash = EntryHash::from(agent_pubkey);
    create_link(agent_entry_hash, entry_hash, ())?;

    let wire_entry = WireEntry {
        entry,
        address: WrappedHeaderHash(header_hash),
    };

    // we don't want to cause real failure for inability to send to peers
    let signal = AgentSignal {
        entry_type: agent_signal_entry_type(),
        action: ActionType::Create,
        data: SignalData::Create(wire_entry.clone()),
    };
    let _ = send_agent_signal(signal);

    Ok(wire_entry)
}

fn agent_signal_entry_type() -> String {
    "agent".to_string()
}

#[hdk_extern]
pub fn update_whoami(update: WireEntry) -> ExternResult<WireEntry> {
    update_entry(update.address.0.clone(), &update.entry)?;
    // // send update to peers
    // we don't want to cause real failure for inability to send to peers
    let signal = AgentSignal {
        entry_type: agent_signal_entry_type(),
        action: ActionType::Update,
        data: SignalData::Update(update.clone()),
    };
    let _ = send_agent_signal(signal);
    Ok(update)
}

#[hdk_extern]
pub fn whoami(_: ()) -> ExternResult<WhoAmIOutput> {
    let agent_pubkey = agent_info()?.agent_initial_pubkey;
    let agent_entry_hash = EntryHash::from(agent_pubkey);

    let all_profiles = get_links(agent_entry_hash, None)?.into_inner();
    let maybe_profile_link = all_profiles.last();
    // // do it this way so that we always keep the original profile entry address
    // // from the UI perspective
    match maybe_profile_link {
        Some(profile_link) => match get_latest_for_entry::<Profile>(
            profile_link.target.clone(),
            GetOptions::content(),
        )? {
            Some(entry_and_hash) => Ok(WhoAmIOutput(Some(WireEntry::from(entry_and_hash)))),
            None => Ok(WhoAmIOutput(None)),
        },
        None => Ok(WhoAmIOutput(None)),
    }
}

#[hdk_extern]
pub fn fetch_agents(_: ()) -> ExternResult<AgentsOutput> {
    let path_hash = Path::from(AGENTS_PATH).hash()?;
    let entries = fetch_links::<Profile, Profile>(path_hash, GetOptions::content())?;
    Ok(AgentsOutput(entries))
}

#[hdk_extern]
fn fetch_agent_address(_: ()) -> ExternResult<WrappedAgentPubKey> {
    let agent_info = agent_info()?;
    Ok(WrappedAgentPubKey(agent_info.agent_initial_pubkey))
}

/*
SIGNALS
*/

fn send_agent_signal(signal: AgentSignal) -> ExternResult<()> {
    signal_peers(&signal, get_peers_latest)
}

// this will be used to send these data structures as signals to the UI
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, SerializedBytes)]
#[serde(untagged)]
pub enum SignalData {
    Create(WireEntry),
    Update(WireEntry),
}

// this will be used to send these data structures as signals to the UI
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, SerializedBytes)]
pub struct AgentSignal {
    pub entry_type: String,
    pub action: ActionType,
    pub data: SignalData,
}
