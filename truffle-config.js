const HDWalletProvider = require('truffle-hdwallet-provider');
const fs = require('fs');
const infuraKey = fs.readFileSync(".infura").toString().trim();
const mnemonic = fs.readFileSync(".secret").toString().trim();

module.exports = {
    networks: {

        development: {
            host: "127.0.0.1",
            port: 7545,
            network_id: "*"
        },

        rinkeby: {
            provider: function () {
                return new HDWalletProvider(mnemonic,
                    "https://rinkeby.infura.io/v3/" + infuraKey)
            },
            from: 0xC16f1eDAbfAEa8981F2Ba8D61401f7a76B1fDa50,
            network_id: 4,
            gas: 4500000,
            gasPrice: 10000000000,
        }
    },

    compilers: {
        solc: {
            version: "0.8.0",
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200
                },
                evmVersion: "byzantium"
            }
        }
    },

    db: {
        enabled: false
    },

    plugins: [
        'truffle-contract-size'
    ]
};