const shell = require('shelljs');
const config = require('./config.json');

const NODES_NUMBER = 4;
const BOOTNODES_NUMBER = 2;
const NODE_PREFIX = 'chain'

if(BOOTNODES_NUMBER >= NODES_NUMBER) {
    throw new Error('Amount of normal nodes should be greater then bootnodes');
}

const runner = 'docker-compose run polygon-edge';
const initNodeCommand = `secrets init --json --data-dir ${config.data_dir}/${NODE_PREFIX}-`;

// Init nodes
const initData = {};
for(let i = 1; i <= NODES_NUMBER; i++) {
    const cmd = `${runner} ${initNodeCommand}${i}`;
    const {stdout} = shell.exec(cmd);
    const nodeConfig = JSON.parse(stdout);
    initData[`${NODE_PREFIX}-${i}`] = nodeConfig;
}

// set bootnodes
const HOST = '127.0.0.1';
const PORT_POSTFIX = '0001';

const bootnodes = [];

for(let i = 1; i <= BOOTNODES_NUMBER; i++) {
    const bootnodeId = initData[`${NODE_PREFIX}-${i}`].node_id;
    const port = `${i}${PORT_POSTFIX}`;
    const bootnode = `/ip4/${HOST}/tcp/${port}/p2p/${bootnodeId}`;
    bootnodes.push(bootnode);
}

// generate genesis
const genesisCommand = `genesis \\
    --consensus ibft \\
    --ibft-validators-prefix-path test-chain- \\
    ${bootnodes.map(node => `--bootnode ${node} \\`)}
    --dir ${config.data_dir}/genesis.json
`;
shell.exec(`${runner} ${genesisCommand}`, {silent: true});

// Add config.json to volumes as it will be used there
shell.exec(`cp ./config.json ./volumes`, {silent: true});

// cleaning up docker-compose
shell.exec(`docker-compose down`, {silent: true});

console.log('Init done!');