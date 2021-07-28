const { assert } = require('chai')
const truffleAssert = require('truffle-assertions')

const Contract = artifacts.require('./ImnotArtExhibitions.sol')

require('chai')
    .use(require('chai-as-promised'))
    .should()

contract('Contract', (accounts) => {
    const imnotArtAddress = accounts[1];
    const artistOneAddress = accounts[5];
    const artistTwoAddress = accounts[6];
    const marketplaceAddress = accounts[9];

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

    describe('updating', async () => {

        it('non-admin fails updates', async () => {
            await truffleAssert.fails(
                contract.addAdmin(imnotArtAddress, {from: imnotArtAddress}),
                truffleAssert.ErrorType.REVERT,
                'Only admins.'
            )
        })

        it('can add a new admin', async () => {
            await truffleAssert.passes(
                contract.addAdmin(imnotArtAddress)
            )
        })

        it('new admin can add another admin', async () => {
            await truffleAssert.passes(
                contract.addAdmin(accounts[2], {from: imnotArtAddress})
            )
        })

        it('can update contract uri', async () => {
            let contractUri = await contract.contractURI()
            assert.equal(contractUri, '')

            await contract.updateContractUri('contract-uri')

            contractUri = await contract.contractURI()
            assert.equal(contractUri, 'contract-uri')
        })
    })

    describe('minting', async () => {

        it('successful minting', async () => {
            let metadataUri = 'metadata-uri-test'
            let nextTokenId = await contract.nextTokenId()

            const mintTransaction = await contract.mintToken(artistOneAddress, metadataUri, 6500, 500, false)

            truffleAssert.eventEmitted(mintTransaction, 'Transfer', {to: artistOneAddress, tokenId: nextTokenId})
            truffleAssert.eventEmitted(mintTransaction, 'PermanentURI', {_value: metadataUri, _id: nextTokenId})

            let tokenUri = await contract.tokenURI(nextTokenId)
            assert.equal(tokenUri, 'metadata-uri-test')

            nextTokenId = await contract.nextTokenId()
            assert.equal(nextTokenId.toString(), web3.utils.toBN(2).toString())
        })

        it('successful minting and transfer to marketplace', async () => {

        })

        it('non-admin fails minting', async () => {
            await truffleAssert.fails(
                contract.mintToken(artistOneAddress, 'metadata-uri-test', 6500, 500, false, {from: accounts[9]}),
                truffleAssert.ErrorType.REVERT,
                'Only admins.'
            )
        })
    })

    describe('getting data', async () => {
        
    })
})