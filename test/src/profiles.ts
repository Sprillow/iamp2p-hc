import { Config } from '@holochain/tryorama'
import { ScenarioApi } from '@holochain/tryorama/lib/api'
import * as _ from 'lodash'
import path from 'path'
import { delay } from './timer'

const config = Config.gen()
const profilesDnaPath = path.join(__dirname, '../../dnas/projects/projects.dna.gz')

module.exports = (orchestrator) => {
  orchestrator.registerScenario('profiles test', async (s: ScenarioApi, t) => {
    const [conductor1] = await s.players([config])
    const [[profileHapp]] = await conductor1.installAgentsHapps([[[profilesDnaPath]]])
    const [profilesCell] = profileHapp.cells
    // fetch_agent_address
    const agent_address = await profilesCell.call(
      'iamp2p_projects',
      'fetch_agent_address',
    )

    const profile = {
      created_at: Date.now(),
      handle: 'ct',
      avatar_url: 'test',
      address: agent_address,
    }
    const create_whoami = await profilesCell.call(
      'iamp2p_projects',
      'create_whoami',
      profile
    )

    const fetchAgentsResult = await profilesCell.call(
      'iamp2p_projects',
      'fetch_agents',
      )

    t.deepEqual(fetchAgentsResult, [profile])

    // UPDATE WHOAMI
    const profile2 = {
      created_at: Date.now(),
      handle: 'ct',
      avatar_url: 'test2',
      address: agent_address,
    }
    const update_whoami = await profilesCell.call(
      'iamp2p_projects',
      'update_whoami',
      {
        entry: profile2,
        address: create_whoami.address,
      }
    )
    t.deepEqual(update_whoami.entry, profile2)

    await delay(2000)

    // WHOAMI
    const whoami2 = await profilesCell.call(
      'iamp2p_projects',
      'whoami',
    )
    t.deepEqual(whoami2.entry, {
      ...profile2,
      avatar_url: 'test2',
    })

    // UPDATE WHOAMI Again
    const profile3 = {
      created_at: Date.now(),
      handle: 'ct',
      avatar_url: 'testhi',
      address: agent_address,
    }
    await profilesCell.call(
      'iamp2p_projects',
      'update_whoami',
      {
        entry: profile3,
        address: create_whoami.address,
      }
    )
    await delay(2000)
    const whoami3 = await profilesCell.call(
      'iamp2p_projects',
      'whoami',
    )
    t.deepEqual(whoami3.entry, profile3)
  })
}
