extern crate hdk;
extern crate hdk_proc_macros;
extern crate holochain_json_derive;
extern crate serde;
extern crate serde_derive;
extern crate serde_json;
use hdk::entry_definition::ValidatingEntryType;
use hdk::holochain_core_types::{
    // agent::AgentId, dna::entry_types::Sharing, entry::Entry, link::LinkMatch,
    dna::entry_types::Sharing,
    entry::Entry,
};

pub fn init() {
    let goals_anchor_entry = Entry::App(
        "anchor".into(), // app entry type
        // app entry value. We'll use the value to specify what this anchor is for
        "goals".into(),
    );
    let edges_anchor_entry = Entry::App(
        "anchor".into(), // app entry type
        // app entry value. We'll use the value to specify what this anchor is for
        "edges".into(),
    );
    let goal_members_anchor_entry = Entry::App(
        "anchor".into(), // app entry type
        // app entry value. We'll use the value to specify what this anchor is for
        "goal_members".into(),
    );
    let goal_vote_anchor_entry = Entry::App(
        "anchor".into(), // app entry type
        // app entry value. We'll use the value to specify what this anchor is for
        "goal_votes".into(),
    );
    let goal_comment_anchor_entry = Entry::App(
        "anchor".into(), // app entry type
        // app entry value. We'll use the value to specify what this anchor is for
        "goal_comments".into(),
    );
    let agents_anchor_entry = Entry::App(
        "anchor".into(), // app entry type
        // app entry value. We'll use the value to specify what this anchor is for
        "agents".into(),
    );
    let _ = hdk::commit_entry(&goal_comment_anchor_entry);
    let _ = hdk::commit_entry(&goal_vote_anchor_entry);
    let _ = hdk::commit_entry(&goal_members_anchor_entry);
    let _ = hdk::commit_entry(&goals_anchor_entry);
    let _ = hdk::commit_entry(&edges_anchor_entry);
    let _ = hdk::commit_entry(&agents_anchor_entry);
}
pub fn anchor_def() -> ValidatingEntryType {
    entry!(
        name: "anchor",
        description: "this is an anchor entry that we can link other entries to so we can find them",
        sharing: Sharing::Public,
        validation_package: || {
            hdk::ValidationPackageDefinition::Entry
        },
        validation: | _validation_data: hdk::EntryValidationData<String>| {
            Ok(())
        },
        links: [
            to!(
                "profile",
                link_type: "anchor->profiles",
                validation_package: || {
                    hdk::ValidationPackageDefinition::Entry
                },
                validation: | _validation_data: hdk::LinkValidationData| {
                    Ok(())
                }
            ),
            to!(
                "goal",
                link_type: "anchor->goal",
                validation_package: || {
                    hdk::ValidationPackageDefinition::Entry
                },
                validation: | _validation_data: hdk::LinkValidationData| {
                    Ok(())
                }
            ),
            to!(
                "edge",
                link_type: "anchor->edge",
                validation_package: || {
                    hdk::ValidationPackageDefinition::Entry
                },
                validation: | _validation_data: hdk::LinkValidationData| {
                    Ok(())
                }
            ),
            to!(
                "goal_member",
                link_type: "anchor->goal_member",
                validation_package: || {
                    hdk::ValidationPackageDefinition::Entry
                },
                validation: | _validation_data: hdk::LinkValidationData| {
                    Ok(())
                }
            ),
            to!(
                "goal_vote",
                link_type: "anchor->goal_vote",
                validation_package: || {
                    hdk::ValidationPackageDefinition::Entry
                },
                validation: | _validation_data: hdk::LinkValidationData| {
                    Ok(())
                }
            ),
            to!(
                "goal_comment",
                link_type: "anchor->goal_comment",
                validation_package: || {
                    hdk::ValidationPackageDefinition::Entry
                },
                validation: | _validation_data: hdk::LinkValidationData| {
                    Ok(())
                }
            )
        ]
    )
}
