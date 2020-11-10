use crate::{get_peers, SignalType};
use dna_help::{WrappedAgentPubKey, WrappedHeaderHash, crud};
use hdk3::prelude::*;

// a relationship between a Goal and an Agent
#[hdk_entry(id = "goal_member")]
#[derive(Debug, Clone, PartialEq)]
pub struct GoalMember {
  pub goal_address: WrappedHeaderHash,
  pub agent_address: WrappedAgentPubKey,
  pub user_edit_hash: Option<WrappedAgentPubKey>,
  pub unix_timestamp: f64,
}

fn convert_to_receiver_signal(signal: GoalMemberSignal) -> SignalType {
  SignalType::GoalMember(signal)
}

crud!(GoalMember, goal_member, "goal_member", get_peers, convert_to_receiver_signal);

// DELETE
// clear all members
pub fn archive_goal_members(address: WrappedHeaderHash) -> ExternResult<Vec<WrappedHeaderHash>> {
  Ok(inner_fetch_goal_members()?
    .0.into_iter()
    .filter(|wire_entry: &GoalMemberWireEntry| {
      // check whether the parent_address or child_address is equal to the given address.
      // If so, the edge is connected to the goal being archived.
      wire_entry.entry.goal_address == address.clone()
    })
    .map(|wire_entry: GoalMemberWireEntry| {
      let goal_member_address = wire_entry.address;
      // archive the edge with this address
      // this will also trigger signals
      match inner_archive_goal_member(goal_member_address.clone(), true) {
        Ok(_) => {
          Ok(goal_member_address)
        }
        Err(e) => Err(e),
      }
    })
    // filter out errors
    .filter_map(Result::ok)
    .collect())
}
