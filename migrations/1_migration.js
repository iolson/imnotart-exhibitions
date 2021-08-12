const Contract = artifacts.require('imnotArtExhibition1')

module.exports = function (deployer, network, accounts) {
    deployer.deploy(Contract);
}