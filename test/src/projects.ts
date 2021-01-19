import { Config, Orchestrator } from '@holochain/tryorama'
import { ScenarioApi } from '@holochain/tryorama/lib/api'
import * as _ from 'lodash'
import path from 'path'
import { delay } from './timer'

const ZOME = 'iamp2p_projects'
const config = Config.gen()
const projectsDnaPath = path.join(
  __dirname,
  '../../dnas/projects/projects.dna.gz'
)
type Hash = Buffer

async function setup(scenario: ScenarioApi) {
  const [conductor] = await scenario.players([config])
  const [
    [
      {
        agent,
        cells: [projectsCell],
      },
    ],
  ] = await conductor.installAgentsHapps([[[projectsDnaPath]]])

  function callAlice(fn: string, payload?: any) {
    return projectsCell.call(ZOME, fn, payload)
  }

  // await delay(5000)

  return { callAlice, agentAddress: agent }
}

module.exports = (orchestrator: Orchestrator<null>) => {
  orchestrator.registerScenario(
    'trx api',
    async (scenario: ScenarioApi, tape) => {
      const { callAlice, agentAddress } = await setup(scenario)

      const { Codec } = await import('@holo-host/cryptolib')
      const aa = Codec.AgentId.encode(agentAddress)

      // TODO: change TO to someone elses address
      const entry = {
        from: aa,
        to: aa, 
        created_at: Date.now(),
        amount: 100,
      }
      const createResult = await callAlice(`create_trx`, entry)
      tape.deepEqual(createResult.entry, entry)

      // READ
      const fetchResult = await callAlice(`fetch_trxs`, null)
      tape.equal(fetchResult.length, 1)
      tape.deepEqual(fetchResult[0], createResult)
    }
  )

  orchestrator.registerScenario(
    'project_meta api',
    async (scenario: ScenarioApi, tape) => {
      const { callAlice, agentAddress } = await setup(scenario)

      const { Codec } = await import('@holo-host/cryptolib')
      const aa = Codec.AgentId.encode(agentAddress)

      try {
        await callAlice('fetch_project_meta')
      } catch (e) {
        tape.equal(true, e.data.data.includes('no project meta exists'))
      }

      // CREATE
      const entry = {
        creator_address: aa,
        created_at: Date.now(),
        passphrase: 'pinky-stomp-tuffle-waffle',
      }
      const createResult = await callAlice(`create_project_meta`, entry)
      tape.deepEqual(createResult.entry, entry)
      // READ
      const fetchResult = await callAlice(`fetch_project_meta`, null)
      tape.deepEqual(fetchResult, createResult)
    }
  )
}
