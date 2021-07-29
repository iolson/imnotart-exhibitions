const { assert } = require('chai')
const truffleAssert = require('truffle-assertions')

const Contract = artifacts.require('./ImnotArtExhibitions.sol')

require('chai')
    .use(require('chai-as-promised'))
    .should()

contract('Contract', (accounts) => {
    const imnotArtAdminAddress = accounts[1];
    const imnotArtPayoutAddress = accounts[2];
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
                contract.addAdmin(imnotArtAdminAddress, {from: imnotArtAdminAddress}),
                truffleAssert.ErrorType.REVERT,
                'Only admins.'
            )
        })

        it('can add a new admin', async () => {
            await truffleAssert.passes(
                contract.addAdmin(imnotArtAdminAddress)
            )
        })

        it('new admin can add another admin', async () => {
            await truffleAssert.passes(
                contract.addAdmin(imnotArtPayoutAddress, {from: imnotArtAdminAddress})
            )
        })

        it('can update contract uri', async () => {
            let contractUri = await contract.contractURI()
            assert.equal(contractUri, '')

            await contract.updateContractUri('contract-uri')

            contractUri = await contract.contractURI()
            assert.equal(contractUri, 'contract-uri')
        })

        it('can update imnotArt payout address', async () => {
            let contractImnotArtPayoutAddress = await contract.imnotArtPayoutAddress()
            assert.equal(contractImnotArtPayoutAddress, 0x0)

            await contract.updateImnotArtPayoutAddress(imnotArtPayoutAddress)

            contractImnotArtPayoutAddress = await contract.imnotArtPayoutAddress()
            assert.equal(contractImnotArtPayoutAddress, imnotArtPayoutAddress)
        })

        it('can update marketplace address', async () => {
            let contractMarketplaceAddress = await contract.marketplaceAddress()
            assert.equal(contractMarketplaceAddress, 0x0)

            await contract.updateMarketplaceAddress(marketplaceAddress)

            contractMarketplaceAddress = await contract.marketplaceAddress()
            assert.equal(contractMarketplaceAddress, marketplaceAddress)
        })
    })

    describe('minting', async () => {

        it('successful minting', async () => {
            const beforeMintTokenIds = await contract.getTokensOfOwner(artistOneAddress)
            assert.equal(beforeMintTokenIds.length, 0)

            let metadataUri = 'metadata-uri-test'
            let nextTokenId = await contract.nextTokenId()

            const mintTransaction = await contract.mintToken(artistOneAddress, metadataUri, 6500, 500, false)

            truffleAssert.eventEmitted(mintTransaction, 'Transfer', {to: artistOneAddress, tokenId: nextTokenId})
            truffleAssert.eventEmitted(mintTransaction, 'PermanentURI', {_value: metadataUri, _id: nextTokenId})

            let tokenUri = await contract.tokenURI(nextTokenId)
            assert.equal(tokenUri, 'metadata-uri-test')

            nextTokenId = await contract.nextTokenId()
            assert.equal(nextTokenId.toString(), web3.utils.toBN(2).toString())

            const afterMintTokenIds = await contract.getTokensOfOwner(artistOneAddress)
            assert.equal(afterMintTokenIds.length, 1)
        })

        it('successful minting and transfer to marketplace', async () => {
            const artistBeforeMintTokenIds = await contract.getTokensOfOwner(artistTwoAddress)
            assert.equal(artistBeforeMintTokenIds.length, 0)

            const marketplaceBeforeMintTokenIds = await contract.getTokensOfOwner(marketplaceAddress)
            assert.equal(marketplaceBeforeMintTokenIds.length, 0)

            let metadataUri = 'metadata-uri-test'
            let nextTokenId = await contract.nextTokenId()

            const mintTransaction = await contract.mintToken(artistTwoAddress, metadataUri, 6500, 500, true)

            truffleAssert.eventEmitted(mintTransaction, 'Transfer', {to: artistTwoAddress, tokenId: nextTokenId})
            truffleAssert.eventEmitted(mintTransaction, 'PermanentURI', {_value: metadataUri, _id: nextTokenId})
            truffleAssert.eventEmitted(mintTransaction, 'Approval', {owner: artistTwoAddress, tokenId: nextTokenId})
            truffleAssert.eventEmitted(mintTransaction, 'Transfer', {from: artistTwoAddress, to: marketplaceAddress, tokenId: nextTokenId})

            let tokenUri = await contract.tokenURI(nextTokenId)
            assert.equal(tokenUri, 'metadata-uri-test')

            nextTokenId = await contract.nextTokenId()
            assert.equal(nextTokenId.toString(), web3.utils.toBN(3).toString())

            const artistAfterMintTokenIds = await contract.getTokensOfOwner(artistTwoAddress)
            assert.equal(artistAfterMintTokenIds.length, 0)

            const marketplaceAfterMintTokenIds = await contract.getTokensOfOwner(marketplaceAddress)
            assert.equal(marketplaceAfterMintTokenIds.length, 1)
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

        it('rariable can get royalties', async () => {
            const royalties = await contract.getRoyalties('1')
            assert.equal(royalties[0].account, artistOneAddress)
            assert.equal(royalties[0].value, 500)
            assert.equal(royalties[1].account, imnotArtPayoutAddress)
            assert.equal(royalties[1].value, 250)
        })
    })
})