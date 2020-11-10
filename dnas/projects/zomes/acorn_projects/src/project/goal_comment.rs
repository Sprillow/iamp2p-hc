use crate::{get_peers, SignalType};
use dna_help::{crud, WrappedAgentPubKey, WrappedHeaderHash};
use hdk3::prelude::*;

#[hdk_entry(id = "goal_comment")]
#[derive(Debug, Clone, PartialEq)]
pub struct GoalComment {
    pub goal_address: WrappedHeaderHash,
    pub content: String,
    pub agent_address: WrappedAgentPubKey,
    pub unix_timestamp: f64,
}

fn convert_to_receiver_signal(signal: GoalCommentSignal) -> SignalType {
    SignalType::GoalComment(signal)
}

crud!(
    GoalComment,
    goal_comment,
    "goal_comment",
    get_peers,
    convert_to_receiver_signal
);
