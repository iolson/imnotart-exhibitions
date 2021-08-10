const { assert } = require('chai')
const truffleAssert = require('truffle-assertions')

const Contract = artifacts.require('./ImnotArtExhibitions.sol')

require('chai')
    .use(require('chai-as-promised'))
    .should()

contract('Contract', (accounts) => {
    const imnotArtAdminAddress = accounts[1]
    const imnotArtPayoutAddress = accounts[2]
    const artistOneAddress = accounts[5]
    const artistTwoAddress = accounts[6]
    const artistThreeAddress = accounts[7]
    const artistOneRoyaltyContractAddress = accounts[8]
    const marketplaceAddress = accounts[9]

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

        it('can add a royalty contract address for artist', async () => {
            await truffleAssert.passes(
                contract.addRoyaltyContractAddress(artistOneAddress, artistOneRoyaltyContractAddress)
            )
        })

        it('can toggle using royalty contract addresses', async () => {
            const beforeToggle = await contract.useRoyaltyContracts()
            assert.isFalse(beforeToggle)

            await truffleAssert.passes(
                contract.toggleUseRoyaltyContracts()
            )

            const afterToggle = await contract.useRoyaltyContracts()
            assert.isTrue(afterToggle);
        })
    })

    describe('minting', async () => {

        it('successful minting', async () => {
            const beforeMintTokenIds = await contract.getTokensOfOwner(artistOneAddress)
            assert.equal(beforeMintTokenIds.length, 0)

            let metadataUri = 'metadata-uri-test'
            let nextTokenId = await contract.nextTokenId()

            const mintTransaction = await contract.mintToken(artistOneAddress, metadataUri)

            truffleAssert.eventEmitted(mintTransaction, 'Transfer', {to: artistOneAddress, tokenId: nextTokenId})
            truffleAssert.eventEmitted(mintTransaction, 'PermanentURI', {_value: metadataUri, _id: nextTokenId})

            let tokenUri = await contract.tokenURI(nextTokenId)
            assert.equal(tokenUri, 'metadata-uri-test')

            nextTokenId = await contract.nextTokenId()
            assert.equal(nextTokenId.toString(), web3.utils.toBN(2).toString())

            const afterMintTokenIds = await contract.getTokensOfOwner(artistOneAddress)
            assert.equal(afterMintTokenIds.length, 1)
        })

        it('can mint as approved artist', async () => {
            const artistBeforeMintTokenIds = await contract.getTokensOfOwner(artistOneAddress)
            assert.equal(artistBeforeMintTokenIds.length, 1)

            let metadataUri = 'metadata-uri-test'
            let nextTokenId = await contract.nextTokenId()

            const mintTransaction = await contract.artistMintToken(metadataUri, {from: artistOneAddress})

            truffleAssert.eventEmitted(mintTransaction, 'Transfer', {to: artistOneAddress, tokenId: nextTokenId})
            truffleAssert.eventEmitted(mintTransaction, 'PermanentURI', {_value: metadataUri, _id: nextTokenId})

            let tokenUri = await contract.tokenURI(nextTokenId)
            assert.equal(tokenUri, 'metadata-uri-test')

            nextTokenId = await contract.nextTokenId()
            assert.equal(nextTokenId.toString(), web3.utils.toBN(3).toString())

            const afterMintTokenIds = await contract.getTokensOfOwner(artistOneAddress)
            assert.equal(afterMintTokenIds.length, 2)
        })

        it('non-admin fails minting', async () => {
            await truffleAssert.fails(
                contract.mintToken(artistOneAddress, 'metadata-uri-test', {from: accounts[9]}),
                truffleAssert.ErrorType.REVERT,
                'Only admins.'
            )
        })

        it('non-approved artist fails minting', async () => {
            await truffleAssert.fails(
                contract.artistMintToken('metadata-uri-test', {from: artistTwoAddress}),
                truffleAssert.ErrorType.REVERT,
                'Only approved artists.'
            )
        })

        it('can update token metadata', async () => {
            await truffleAssert.passes(
                contract.updateTokenMetadata('1', 'update', false)
            )

            let tokenUri = await contract.tokenURI('1')
            assert.equal(tokenUri, 'update')

            const updateMetadataWithEvent = await contract.updateTokenMetadata('1', 'update2', true)

            truffleAssert.eventEmitted(updateMetadataWithEvent, 'PermanentURI', {_value: 'update2', _id: web3.utils.toBN(1)})
            
            tokenUri = await contract.tokenURI('1')
            assert.equal(tokenUri, 'update2')
        })
    })

    describe('burning', async () => {
        it('an approved artist can burn token if they own it', async () => {
            const artistBeforeMintTokenIds = await contract.getTokensOfOwner(artistOneAddress)
            assert.equal(artistBeforeMintTokenIds.length, 2)

            const burnTransaction = await contract.burn(2, {from: artistOneAddress})

            truffleAssert.eventEmitted(burnTransaction, 'Approval', {owner: artistOneAddress, tokenId: web3.utils.toBN(2)})
            truffleAssert.eventEmitted(burnTransaction, 'Transfer', {from: artistOneAddress, tokenId: web3.utils.toBN(2)})

            const afterMintTokenIds = await contract.getTokensOfOwner(artistOneAddress)
            assert.equal(afterMintTokenIds.length, 1)

            await truffleAssert.fails(
                contract.tokenURI('2'),
                truffleAssert.ErrorType.REVERT,
                'Token ID does not exist.'
            )
        })

        it('an approved artist cant burn token if they dont own it', async () => {
            await contract.mintToken(artistTwoAddress, 'test-metadata')

            await truffleAssert.fails(
                contract.burn(3, {from: artistOneAddress}),
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

        it('invalid token token uri', async () => {
            truffleAssert.fails(
                contract.tokenURI(0),
                truffleAssert.ErrorType.REVERT,
                'Token ID does not exist.'
            )
        })
    })

    describe('rarible royalties', async () => {

        it('rariable can get royalties', async () => {
            const royalties = await contract.getRaribleV2Royalties('1')
            assert.equal(royalties[0].account, artistOneAddress)
            assert.equal(royalties[0].value, 500)
            assert.equal(royalties[1].account, imnotArtPayoutAddress)
            assert.equal(royalties[1].value, 250)
        })
    })

    describe('EIP-2981 royalty', async () => {

        it('royalty info - no royalty contract on file', async () => {
            await contract.mintToken(artistThreeAddress, 'metadata')
            const royaltyInfo = await contract.royaltyInfo('4', web3.utils.toWei('5.2', 'ether'))
            assert.equal(royaltyInfo.receiver, imnotArtPayoutAddress)
            assert.equal(royaltyInfo.amount.toString(), web3.utils.toBN(web3.utils.toWei('0.39', 'ether')).toString())
        })

        it('royalty info - royalty contract on file', async () => {
            const royaltyInfo = await contract.royaltyInfo('1', web3.utils.toWei('5.2', 'ether'))
            assert.equal(royaltyInfo.receiver, artistOneRoyaltyContractAddress)
            assert.equal(royaltyInfo.amount.toString(), web3.utils.toBN(web3.utils.toWei('0.39', 'ether')).toString())
        })

        it('royalty info - royalty contracts: false - imnotArt fallback', async () => {
            await truffleAssert.passes(
                contract.toggleUseRoyaltyContracts()
            )

            const royaltyInfo = await contract.royaltyInfo('1', web3.utils.toWei('5.2', 'ether'))
            assert.equal(royaltyInfo.receiver, imnotArtPayoutAddress)
            assert.equal(royaltyInfo.amount.toString(), web3.utils.toBN(web3.utils.toWei('0.39', 'ether')).toString())
        })
    })
})