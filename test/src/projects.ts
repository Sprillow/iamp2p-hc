import { Config } from '@holochain/tryorama'
import * as _ from 'lodash'
import { delay } from './timer'

const ZOME = 'acorn_projects'
const ALICE_USER_NICK = 'alice'
const BOBBO_USER_NICK = 'bobbo'

// Configure a conductor with two identical DNAs,
// differentiated by UUID, nicknamed "alice" and "bobbo"
const config = Config.gen(
  {
    [ALICE_USER_NICK]: Config.dna('../dnas/projects/projects.dna.gz', null),
    [BOBBO_USER_NICK]: Config.dna('../dnas/projects/projects.dna.gz', null),
  }
  // { logger: Config.logger(true) }
)

interface Hash {
  hash: Buffer
  hash_type: Buffer
}

function newGoal(agentAddress: Hash, content: string) {
  return {
    content,
    description: 'Test Goal Description',
    user_hash: agentAddress,
    user_edit_hash: null,
    timestamp_created: Date.now(),
    timestamp_updated: null,
    hierarchy: { Root: null },
    status: { Uncertain: null },
    tags: null,
    time_frame: null,
  }
}

module.exports = (orchestrator) => {
  orchestrator.registerScenario('goal api', async (s, t) => {
    // spawn the conductor process
    const { cndtr } = await s.players({ cndtr: config })
    await cndtr.spawn()

    const [_dnaHash, agentAddress] = cndtr.cellId(ALICE_USER_NICK)

    function callAlice(fn: string, payload: any) {
      return cndtr.call(ALICE_USER_NICK, ZOME, fn, payload)
    }

    const result = await callAlice('test', null)
    console.log('"test" result:', result)

    const goal = newGoal(agentAddress, 'Test Goal Content')
    const createGoalResult = await callAlice('create_goal', goal)
    t.deepEqual(createGoalResult.entry, goal)

    const fetchGoalsResult = await callAlice('fetch_goals', null)
    t.equal(fetchGoalsResult.length, 1)
    t.deepEqual(fetchGoalsResult[0], createGoalResult)

    const updatedGoal = newGoal(agentAddress, 'Updated Goal Content')
    const updateGoalResult = await callAlice('update_goal', {
      entry: updatedGoal,
      address: createGoalResult.address,
    })
    // the address should stay continuous from the original creation
    // of the goal
    t.deepEqual(updateGoalResult.address, createGoalResult.address)

    const fetchGoals2Result = await callAlice('fetch_goals', null)
    t.equal(fetchGoals2Result.length, 1)
    // the address should stay continuous from the original creation
    // of the goal, but the entry/goal itself should contain the updated
    // values
    t.deepEqual(fetchGoals2Result[0], updateGoalResult)

    const archiveGoalResult = await callAlice(
      'archive_goal',
      createGoalResult.address
    )
    t.deepEqual(archiveGoalResult, createGoalResult.address)

    const fetchGoals3Result = await callAlice('fetch_goals', null)
    t.equal(fetchGoals3Result.length, 0)
  })
}
