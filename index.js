const shell = require('shelljs');
const { writeFileSync }= require('fs');
const yaml = require('js-yaml');
const config = require('./config.json');

const NODES_NUMBER = 4;
const BOOTNODES_NUMBER = 2;
const NODE_PREFIX = 'chain';
const mnemonic = 'snap weird dice buyer steak tool victory cactus spell mansion evoke document'

const preminded = [
    '0x56Bc1F8C54c299227B678188f10614785e43240F',
    '0x7d6077475212BB963DFbA23A1c999f6370DB6Dd9',
    '0xBd21e4CFbBf6ffed330863A50e60a3FF3a302cF8',
    '0x0D8050F2aE78a443FD71085a4FB3D5D8beE33db1',
];
const etherToPremine = 100;

const correctPort = (url,i) => url.replace(/(\d)\d{4}$/,e => e.replace(/^\d/,i))

if(BOOTNODES_NUMBER >= NODES_NUMBER) {
    throw new Error('Amount of normal nodes should be greater then bootnodes');
}

const runner = 'docker-compose run polygon-edge';
const initNodeCommand = `secrets init --json --data-dir`;

console.log('Ccreate secrets for nodes\n');
// Init nodes
const initData = {};
for(let i = 1; i <= NODES_NUMBER; i++) {
    const dirName = `${config.data_dir}/${NODE_PREFIX}-${i}`
    const cmd = `${runner} ${initNodeCommand} ${dirName}`;
    const {stdout} = shell.exec(cmd);
    const nodeInitData = JSON.parse(stdout);
    initData[`${NODE_PREFIX}-${i}`] = nodeInitData;
    const configFileData = {
        ...config,
        data_dir: dirName,
        jsonrpc_addr: correctPort(config.jsonrpc_addr,i),
        grpc_addr: correctPort(config.grpc_addr,i),
        network: {
            ...config.network,
            libp2p_addr: correctPort(config.network.libp2p_addr,i),
        },
        telemetry: {
            ...config.telemetry,
            prometheus_addr: correctPort(config.telemetry.prometheus_addr,i),
        },
    };
    writeFileSync(`./volumes/chain-${i}/config.json`, JSON.stringify(configFileData));
}

// set bootnodes
const HOST = '127.0.0.1';
const PORT_POSTFIX = '0001';

const bootnodes = [];

for(let i = 1; i <= BOOTNODES_NUMBER; i++) {
    const bootnodeId = initData[`${NODE_PREFIX}-${i}`].node_id;
    const port = `${i}${PORT_POSTFIX}`;
    const bootnode = `/ip4/${HOST}/tcp/${port}/p2p/${bootnodeId}`;
    const data = {
        bootnode,
        publicKey: initData[`${NODE_PREFIX}-${i}`].address
    }
    bootnodes.push(data);
}

// generate genesis with premined accounts
const genesisCommand = `genesis \\
    --consensus ibft \\
    ${bootnodes.map(node=> 
        `--bootnode ${node.bootnode} \\\n    --ibft-validator= ${node.publicKey} \\`).join('\n    ')
    }
    --dir ${config.data_dir}/genesis.json \\
    ${preminded.map(add =>
        `--premine=${add}:${etherToPremine}000000000000000000`
    ).join(' \\\n    ')}
`;
console.log(`\nExecute genesis command: \n${genesisCommand}`)
shell.exec(`${runner} ${genesisCommand}`, {silent: true});


console.log('\nCoppy genesis.json to each node folders');
// Add genesis.json to chain-X folders as it will be used there
for(let i = 1;i <= NODES_NUMBER; i+=1) {
    shell.exec(`cp ./volumes/genesis.json ./volumes/chain-${i}`, {silent: true});
}

console.log('\nClean up docker-compose');
// cleaning up docker-compose
shell.exec(`docker-compose down`, {silent: true});

console.log('\nNew docker-compose.nodes.yaml creation...');
const dcFileName = 'docker-compose.nodes.yaml'
const dcContent = {
    networks: {
        'polygon-edge-chain': {
            'driver':'bridge'
        }
    },
    services: {}
};
// create docker-compose file for nodes
for(let i = 1; i <= NODES_NUMBER; i+=1) {
    dcContent.services[`node-${i}`] = {
        image: '0xpolygon/polygon-edge',
        command: `server --config /data/chain-${i}/config.json`,
        networks: [
            'polygon-edge-chain'
        ],
        ports: [
            `${i}0000:${i}0000`,
            `${i}0001:${i}0001`,
            `${i}0002:${i}0002`,
            `${i}0003:${i}0003`,
        ],
        volumes:[
            `./volumes:/data`
        ]
    };
}
const nodesYaml = yaml.dump(dcContent);
writeFileSync(dcFileName, nodesYaml);

console.log('\nInit is done!\n');
console.log(`Run the next command: docker-compose -f ${dcFileName} up\n`)
console.log(`To stop run: docker-compose -f ${dcFileName} down`)