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

        it('can remove an admin', async () => {
            await truffleAssert.passes(
                contract.removeAdmin(imnotArtPayoutAddress, {from: imnotArtAdminAddress})
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

        it('can add approved artists', async () => {
            await truffleAssert.passes(
                contract.addApprovedArtist(artistOneAddress, {from: imnotArtAdminAddress})
            )
        })

        it('can remove approved artists', async () => {
            await truffleAssert.passes(
                contract.addApprovedArtist(artistTwoAddress, {from: imnotArtAdminAddress})
            )

            await truffleAssert.passes(
                contract.removeApprovedArtist(artistTwoAddress, {from: imnotArtAdminAddress})
            )
        })
    })

    describe('minting', async () => {

        it('successful minting', async () => {
            const beforeMintTokenIds = await contract.getTokensOfOwner(artistOneAddress)
            assert.equal(beforeMintTokenIds.length, 0)

            let metadataUri = 'metadata-uri-test'
            let nextTokenId = await contract.nextTokenId()

            const mintTransaction = await contract.mintToken(artistOneAddress, metadataUri, false)

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

            const mintTransaction = await contract.mintToken(artistTwoAddress, metadataUri, true)

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

        it('can mint as approved artist', async () => {
            const artistBeforeMintTokenIds = await contract.getTokensOfOwner(artistOneAddress)
            assert.equal(artistBeforeMintTokenIds.length, 1)

            let metadataUri = 'metadata-uri-test'
            let nextTokenId = await contract.nextTokenId()

            const mintTransaction = await contract.artistMintToken(metadataUri, false, {from: artistOneAddress})

            truffleAssert.eventEmitted(mintTransaction, 'Transfer', {to: artistOneAddress, tokenId: nextTokenId})
            truffleAssert.eventEmitted(mintTransaction, 'PermanentURI', {_value: metadataUri, _id: nextTokenId})

            let tokenUri = await contract.tokenURI(nextTokenId)
            assert.equal(tokenUri, 'metadata-uri-test')

            nextTokenId = await contract.nextTokenId()
            assert.equal(nextTokenId.toString(), web3.utils.toBN(4).toString())

            const afterMintTokenIds = await contract.getTokensOfOwner(artistOneAddress)
            assert.equal(afterMintTokenIds.length, 2)
        })

        it('can mint as approved artist and transfer to marketplace', async () => {
            // @TODO(iolson): Write Test
        })

        it('non-admin fails minting', async () => {
            await truffleAssert.fails(
                contract.mintToken(artistOneAddress, 'metadata-uri-test', false, {from: accounts[9]}),
                truffleAssert.ErrorType.REVERT,
                'Only admins.'
            )
        })

        it('non-approved artist fails minting', async () => {
            await truffleAssert.fails(
                contract.artistMintToken('metadata-uri-test', false, {from: artistTwoAddress}),
                truffleAssert.ErrorType.REVERT,
                'Only approved artists.'
            )
        })
    })

    describe('burning', async () => {
        it('an approved artist can burn token if they own it', async () => {
            const artistBeforeMintTokenIds = await contract.getTokensOfOwner(artistOneAddress)
            assert.equal(artistBeforeMintTokenIds.length, 2)

            const burnTransaction = await contract.burn(3, {from: artistOneAddress})

            truffleAssert.eventEmitted(burnTransaction, 'Approval', {owner: artistOneAddress, tokenId: web3.utils.toBN(3)})
            truffleAssert.eventEmitted(burnTransaction, 'Transfer', {from: artistOneAddress, tokenId: web3.utils.toBN(3)})

            const afterMintTokenIds = await contract.getTokensOfOwner(artistOneAddress)
            assert.equal(afterMintTokenIds.length, 1)

            await truffleAssert.fails(
                contract.tokenURI('3'),
                truffleAssert.ErrorType.REVERT,
                'Token ID does not exist.'
            )
        })

        it('an approved artist cant burn token if they dont own it', async () => {
            await truffleAssert.fails(
                contract.burn(2, {from: artistOneAddress}),
                truffleAssert.ErrorType.REVERT,
                'Only approved artist owners.'
            )
        })

        it('non-artist cant burn token', async () => {
            await truffleAssert.fails(
                contract.burn(1, {from: accounts[7]}),
                truffleAssert.ErrorType.REVERT,
                'Only approved artists.'
            )
        })
    })

    describe('getting data', async () => {

        it('rariable can get royalties', async () => {
            const recipients = await contract.getFeeRecipients('1')
            assert.equal(recipients[0], artistOneAddress)
            assert.equal(recipients[1], imnotArtPayoutAddress)

            const bps = await contract.getFeeBps('1')
            assert.equal(bps[0], 500)
            assert.equal(bps[1], 250)
        })

        it('invalid token token uri', async () => {
            truffleAssert.fails(
                contract.tokenURI(0),
                truffleAssert.ErrorType.REVERT,
                'Token ID does not exist.'
            )
        })
    })
})