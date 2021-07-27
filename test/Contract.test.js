const { assert } = require('chai')
const truffleAssert = require('truffle-assertions')

const Contract = artifacts.require('./ImnotArtExhibitions.sol')

require('chai')
    .use(require('chai-as-promised'))
    .should()

contract('Contract', (accounts) => {
    const imnotArtAccount = accounts[1];
    const artistOneAddress = accounts[5];
    const artistTwoAddress = accounts[6];

    let contract;

    before(async () => {
        contract = await Contract.deployed()
    })

    describe('deployment', async () => {
        it('deploys successfully', async () => {
            const address = contract.address
            assert.notEqual(address, 0x0)
            assert.notEqual(address, '')
            assert.notEqual(address, null)
            assert.notEqual(address, undefined)
        })
    })

    describe('minting', async () => {

    })

    describe('updating', async () => {

    })
})