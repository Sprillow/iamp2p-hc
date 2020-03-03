/// NB: The tryorama config patterns are still not quite stabilized.
/// See the tryorama README [https://github.com/holochain/tryorama]
/// for a potentially more accurate example

const path = require('path')

const {
  Orchestrator,
  Config,
  combine,
  localOnly,
  tapeExecutor
} = require('@holochain/tryorama')

process.on('unhandledRejection', error => {
  // Will print "unhandledRejection err is not defined"
  console.error('got unhandledRejection:', error)
})

const dnaPath = path.join(__dirname, '../dist/acorn-hc.dna.json')

const globalConfig = {
  logger: {
    type: 'info',
    rules: {
      rules: [
        {
          exclude: true,
          pattern: '.*holochain_core::dht::dht_reducers.*'
        },
        {
          exclude: true,
          pattern: '.*ws.*'
        },
        {
          exclude: true,
          pattern: '.*in_stream::tcp.*'
        },
        {
          exclude: true,
          pattern: '.*holochain_net::sim2h_worker.*'
        },
        {
          exclude: true,
          pattern:
            '.*holochain_core::nucleus::reducers::trace_return_hdk_function.*'
        },
        {
          exclude: true,
          pattern: '.*holochain_core::wasm_engine::api.*'
        },
        {
          exclude: true,
          pattern: '.*holochain::app.*'
        },
        {
          exclude: true,
          pattern: '.*parity.*'
        },
        {
          exclude: true,
          pattern: '.*mio.*'
        },
        {
          exclude: true,
          pattern: '.*tokio.*'
        },
        {
          exclude: true,
          pattern: '.*hyper.*'
        },
        {
          exclude: true,
          pattern: '.*rusoto_core.*'
        },
        {
          exclude: true,
          pattern: '.*want.*'
        },
        {
          exclude: true,
          pattern: '.*rpc.*'
        }
      ]
    },
    state_dump: false
  },
  network: {
    type: 'sim2h',
    sim2h_url: 'ws://localhost:9000' // 'ws://public.sim2h.net:9000'
  } // Config.network('memory')
}

const orchestrator = new Orchestrator({
  middleware: combine(
    // use the tape harness to run the tests, injects the tape API into each scenario
    // as the second argument
    tapeExecutor(require('tape')),

    // specify that all "players" in the test are on the local machine, rather than
    // on remote machines
    localOnly
  )
})

const dna = Config.dna(dnaPath, 'acorn_hc')
const fullConfig = Config.gen({ app: dna }, globalConfig)
orchestrator.registerScenario('create goal test', async (s, t) => {
  // the 'true' is for 'start', which means boot the Conductors
  const { alice } = await s.players({ alice: fullConfig }, true)
  // Make a call to a Zome function
  // indicating the function, and passing it an input
  const addr = await alice.call('app', 'holo_acorn', 'create_goal', {
    goal: {
      content: 'sample content',
      user_hash: alice.info('app').agentAddress,
      timestamp_created: Date.now(),
      hierarchy: 'Branch',
      status: 'Uncertain',
      description: ''
    },
    maybe_parent_address: null
  })

  // Wait for all network activity to
  await s.consistency()
  const result1 = await alice.call('app', 'holo_acorn', 'add_member_of_goal', {
    goal_member: {
      goal_address: addr.Ok.goal.address,
      agent_address: alice.info('app').agentAddress,
      unix_timestamp: Date.now()
    }
  })

  await s.consistency()
  const result2 = await alice.call(
    'app',
    'holo_acorn',
    'archive_member_of_goal',
    {
      address: result1.Ok.address
    }
  )

  await s.consistency()

  // check for equality of the actual and expected results
  t.deepEqual(result1.Ok.address, result2.Ok)
})
orchestrator.registerScenario('create profile test', async (s, t) => {
  // the 'true' is for 'start', which means boot the Conductors
  const { alice } = await s.players({ alice: fullConfig }, true)
  // Make a call to a Zome function
  // indicating the function, and passing it an input
  const addr = await alice.call('app', 'holo_acorn', 'create_goal', {
    goal: {
      content: 'sample content',
      user_hash: alice.info('app').agentAddress,
      timestamp_created: Date.now(),
      hierarchy: 'Branch',
      status: 'Uncertain',
      description: ''
    },
    maybe_parent_address: null
  })
  await s.consistency()
  const addr2 = await alice.call('app', 'holo_acorn', 'create_goal', {
    goal: {
      content: 'sample content',
      user_hash: alice.info('app').agentAddress,
      timestamp_created: Date.now(),
      hierarchy: 'Branch',
      status: 'Uncertain',
      description: ''
    },
    maybe_parent_address: null
  })
  await s.consistency()
  await alice.call('app', 'holo_acorn', 'add_member_of_goal', {
    goal_member: {
      goal_address: addr.Ok.goal.address,
      agent_address: alice.info('app').agentAddress,
      unix_timestamp: Date.now()
    }
  })
  await s.consistency()
  await alice.call('app', 'holo_acorn', 'add_member_of_goal', {
    goal_member: {
      goal_address: addr2.Ok.goal.address,
      agent_address: alice.info('app').agentAddress,
      unix_timestamp: Date.now()
    }
  })
  await s.consistency()
  await alice.call('app', 'holo_acorn', 'update_goal', {
    goal: {
      content: 'sample content2',
      user_hash: alice.info('app').agentAddress,
      timestamp_created: Date.now(),
      hierarchy: 'Root',
      status: 'Uncertain',
      description: '33',
      time_frame: {
        from_date: Date.now(),
        to_date: Date.parse('Aug 9, 2020')
      }
    },
    address: addr.Ok.goal.address
  })
  await s.consistency()
  const history1 = await alice.call('app', 'holo_acorn', 'history_of_goal', {
    address: addr.Ok.goal.address
  })
  await alice.call('app', 'holo_acorn', 'archive_goal', {
    address: addr.Ok.goal.address
  })
  await s.consistency()
  console.log('members', history1.Ok.members)
  t.equal(history1.Ok.entries.length, 2)
})

orchestrator.registerScenario('create profile test', async (s, t) => {
  // the 'true' is for 'start', which means boot the Conductors
  const { alice } = await s.players({ alice: fullConfig }, true)
  // Make a call to a Zome function
  // indicating the function, and passing it an input
  const getProfile = await alice.call('app', 'holo_acorn', 'create_whoami', {
    profile: {
      first_name: 'alice',
      last_name: 'velandia',
      status: 'Online',
      handle: 'Branch',
      avatar_url: '',
      address: alice.info('app').agentAddress
    }
  })

  // Wait for all network activity to
  await s.consistency()

  const result = await alice.call('app', 'holo_acorn', 'whoami', {})
  // check for equality of the actual and expected results
  t.deepEqual(getProfile, result)
})

orchestrator.registerScenario('create goal test', async (s, t) => {
  // the 'true' is for 'start', which means boot the Conductors
  const { alice } = await s.players({ alice: fullConfig }, true)
  // Make a call to a Zome function
  // indicating the function, and passing it an input
  const addr = await alice.call('app', 'holo_acorn', 'create_goal', {
    goal: {
      content: 'sample content',
      user_hash: alice.info('app').agentAddress,
      timestamp_created: Date.now(),
      hierarchy: 'Branch',
      status: 'Uncertain',
      description: ''
    },
    maybe_parent_address: null
  })

  // Wait for all network activity to
  await s.consistency()

  const result = await alice.call('app', 'holo_acorn', 'fetch_goals', {})
  // check for equality of the actual and expected results
  t.deepEqual(addr.Ok.goal, result.Ok[0])
})

orchestrator.registerScenario('two agent test', async (s, t) => {
  // the 'true' is for 'start', which means boot the Conductors
  const { alice, bob } = await s.players(
    { alice: fullConfig, bob: fullConfig },
    true
  )
  // Make a call to a Zome function
  // indicating the function, and passing it an input
  await alice.call('app', 'holo_acorn', 'create_whoami', {
    profile: {
      first_name: 'alice',
      last_name: 'velandia',
      status: 'Online',
      handle: 'Branch',
      avatar_url: '',
      address: alice.info('app').agentAddress
    }
  })
  await s.consistency()
  const result2 = await alice.call('app', 'holo_acorn', 'create_whoami', {
    profile: {
      first_name: 'bob',
      last_name: 'romero',
      handle: 'Branch',
      status: 'Online',
      avatar_url: '',
      address: bob.info('app').agentAddress
    }
  })
  await s.consistency()
  await bob.call('app', 'holo_acorn', 'create_whoami', {
    profile: {
      first_name: 'bob',
      last_name: 'romero',
      status: 'Online',
      handle: 'Branch',
      status: 'Online',

      avatar_url: '',
      address: bob.info('app').agentAddress
    }
  })

  // Wait for all network activity to
  await s.consistency()
  const result_alice = await alice.call(
    'app',
    'holo_acorn',
    'fetch_agent_address',
    {}
  )
  const result_bob = await bob.call(
    'app',
    'holo_acorn',
    'fetch_agent_address',
    {}
  )
  await s.consistency()
  // check for equality of the actual and expected results
  const result = await alice.call('app', 'holo_acorn', 'fetch_agents', {})

  t.equal(result.Ok.length, 2)
  const parsedError = JSON.parse(result2.Err.Internal)
  t.equal(
    parsedError.kind.ValidationFailed,
    'only the same agent as the profile is about can create their profile'
  )
  t.isNotDeepEqual(result_alice.Ok, result_bob.Ok)
})

orchestrator.registerScenario(
  'two agent test create, update and archive goals ',
  async (s, t) => {
    // the 'true' is for 'start', which means boot the Conductors
    const { alice, bob, alex } = await s.players(
      { alice: fullConfig, bob: fullConfig, alex: fullConfig },
      true
    )
    const time2 = Date.now()
    // Make a call to a Zome function
    // indicating the function, and passing it an input
    const goal = await alice.call('app', 'holo_acorn', 'create_goal', {
      goal: {
        content: 'sample content',
        user_hash: alice.info('app').agentAddress,
        timestamp_created: time2,
        hierarchy: 'Branch',
        status: 'Uncertain',
        description: ''
      },
      maybe_parent_address: null
    })

    const goal2 = await bob.call('app', 'holo_acorn', 'create_goal', {
      goal: {
        content: 'sample content',
        user_hash: bob.info('app').agentAddress,
        timestamp_created: Date.now(),
        hierarchy: 'Branch',
        status: 'Uncertain',
        description: '',
        time_frame: {
          from_date: Date.now(),
          to_date: Date.parse('Aug 9, 2020')
        }
      },
      maybe_parent_address: goal.Ok.goal.address
    })

    // Wait for all network activity to
    await s.consistency()
    const time = Date.now()
    const result_bob = await bob.call('app', 'holo_acorn', 'update_goal', {
      goal: {
        content: 'sample content2',
        user_hash: alice.info('app').agentAddress,
        timestamp_created: time,
        hierarchy: 'Root',
        status: 'Uncertain',
        description: '33',
        time_frame: null
      },
      address: goal.Ok.goal.address
    })
    // check for equality of the actual and expected results
    await s.consistency()
    const result_alex = await alex.call(
      'app',
      'holo_acorn',
      'add_member_of_goal',
      {
        goal_member: {
          goal_address: goal.Ok.goal.address,
          agent_address: alice.info('app').agentAddress,
          unix_timestamp: Date.now()
        }
      }
    )
    const result_alex4 = await alex.call(
      'app',
      'holo_acorn',
      'add_vote_of_goal',
      {
        goal_vote: {
          goal_address: goal.Ok.goal.address,
          urgency: 0.5,
          importance: 0.5,
          impact: 0.5,
          effort: 0.5,
          agent_address: alice.info('app').agentAddress,
          unix_timestamp: Date.now()
        }
      }
    )
    await s.consistency()

    const result_alex2 = await alex.call(
      'app',
      'holo_acorn',
      'fetch_goal_members',
      {}
    )
    const result_alex5 = await alex.call(
      'app',
      'holo_acorn',
      'fetch_goal_votes',
      {}
    )
    const result_alice = await alice.call(
      'app',
      'holo_acorn',
      'fetch_goals',
      {}
    )
    t.isNotEqual(goal2.Ok.maybe_edge, null)
    t.equal(result_alice.Ok.length, 2)
    t.deepEqual(result_bob.Ok.entry, {
      content: 'sample content2',
      user_hash: alice.info('app').agentAddress,
      user_edit_hash: bob.info('app').agentAddress,
      timestamp_created: time2,
      timestamp_updated: time,
      hierarchy: 'Root',
      status: 'Uncertain',
      tags: null,
      description: '33',
      time_frame: null
    })
    t.deepEqual(result_alex.Ok.entry, result_alex2.Ok[0].entry)
    t.deepEqual(result_alex4.Ok.entry, result_alex5.Ok[0].entry)
    const result_alex7 = await alex.call(
      'app',
      'holo_acorn',
      'update_goal_vote',
      {
        goal_vote: {
          goal_address: goal.Ok.goal.address,
          urgency: 0,
          importance: 0,
          impact: 0,
          effort: 0,
          agent_address: alice.info('app').agentAddress,
          unix_timestamp: Date.now()
        },
        address: result_alex4.Ok.address
      }
    )
    await s.consistency()
    const result_alex8 = await alex.call(
      'app',
      'holo_acorn',
      'fetch_goal_votes',
      {}
    )

    t.deepEqual(result_alex7.Ok.entry, result_alex8.Ok[0].entry)
    const result_alice2 = await alice.call(
      'app',
      'holo_acorn',
      'archive_goal',
      { address: goal.Ok.goal.address }
    )
    await s.consistency()
    const result_alice3 = await alice.call(
      'app',
      'holo_acorn',
      'fetch_edges',
      {}
    )
    const result_bob2 = await bob.call('app', 'holo_acorn', 'fetch_goals', {})

    const result_alex3 = await alex.call(
      'app',
      'holo_acorn',
      'fetch_goal_members',
      {}
    )
    const result_alex6 = await alex.call(
      'app',
      'holo_acorn',
      'fetch_goal_votes',
      {}
    )

    t.equal(result_alice2.Ok.address, goal.Ok.goal.address)
    t.equal(result_alice3.Ok.length, 0)
    t.equal(result_alex3.Ok.length, 0)
    t.equal(result_alex6.Ok.length, 0)

    t.equal(result_bob2.Ok.length, 1)
  }
)

orchestrator.registerScenario(
  'test create, fetch, update, then re-fetch goals',
  async (s, t) => {
    // the 'true' is for 'start', which means boot the Conductors
    const { alice } = await s.players({ alice: fullConfig }, true)
    const create_goal = await alice.call('app', 'holo_acorn', 'create_goal', {
      goal: {
        content: 'sample content',
        user_hash: alice.info('app').agentAddress,
        timestamp_created: Date.now(),
        hierarchy: 'Branch',
        status: 'Uncertain',
        description: ''
      },
      maybe_parent_address: null
    })
    await s.consistency()
    const first_fetch_goals_result = await alice.call(
      'app',
      'holo_acorn',
      'fetch_goals',
      {}
    )
    await s.consistency()
    const time = Date.now()
    const update_goal = await alice.call('app', 'holo_acorn', 'update_goal', {
      goal: {
        content: 'sample content2',
        user_hash: alice.info('app').agentAddress,
        timestamp_created: time,
        hierarchy: 'Root',
        status: 'Uncertain',
        description: '33'
      },
      address: create_goal.Ok.goal.address
    })
    await s.consistency()
    const second_fetch_goals_result = await alice.call(
      'app',
      'holo_acorn',
      'fetch_goals',
      {}
    )
    t.equal(
      first_fetch_goals_result.Ok[0].address,
      second_fetch_goals_result.Ok[0].address
    )
  }
)

orchestrator.registerScenario('alex and alice are commenting', async (s, t) => {
  // the 'true' is for 'start', which means boot the Conductors
  const { alice, alex } = await s.players(
    { alice: fullConfig, alex: fullConfig },
    true
  )
  // Make a call to a Zome function
  // indicating the function, and passing it an input
  const goal = await alice.call('app', 'holo_acorn', 'create_goal', {
    goal: {
      content: 'sample content',
      user_hash: alice.info('app').agentAddress,
      timestamp_created: Date.now(),
      hierarchy: 'Branch',
      status: 'Uncertain',
      description: ''
    },
    maybe_parent_address: null
  })
  const comment1 = await alice.call(
    'app',
    'holo_acorn',
    'add_comment_of_goal',
    {
      goal_comment: {
        goal_address: goal.Ok.goal.address,
        content: 'hola mundo',
        agent_address: alice.info('app').agentAddress,
        unix_timestamp: Date.now()
      }
    }
  )
  const comment2 = await alex.call('app', 'holo_acorn', 'add_comment_of_goal', {
    goal_comment: {
      goal_address: goal.Ok.goal.address,
      content: 'this is a test',
      agent_address: alex.info('app').agentAddress,
      unix_timestamp: Date.now()
    }
  })
  await s.consistency()
  const update = await alice.call('app', 'holo_acorn', 'update_goal_comment', {
    goal_comment: {
      goal_address: goal.Ok.goal.address,
      content: 'hello world',
      agent_address: alice.info('app').agentAddress,
      unix_timestamp: Date.now()
    },
    address: comment1.Ok.address
  })
  await s.consistency()
  await alex.call('app', 'holo_acorn', 'archive_comment_of_goal', {
    address: comment2.Ok.address
  })
  await s.consistency()
  // Wait for all network activity to
  const fetch = await alice.call('app', 'holo_acorn', 'fetch_goal_comments', {})
  t.equal(fetch.Ok.length, 1)
  t.deepEqual(fetch.Ok[0].entry, update.Ok.entry)
  await alice.call('app', 'holo_acorn', 'archive_goal', {
    address: goal.Ok.goal.address
  })
  await s.consistency()
  const fetch2 = await alice.call(
    'app',
    'holo_acorn',
    'fetch_goal_comments',
    {}
  )
  t.equal(fetch2.Ok.length, 0)
})
orchestrator.run()
