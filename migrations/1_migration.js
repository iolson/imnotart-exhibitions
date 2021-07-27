const Contract = artifacts.require('ImnotArtExhibitions')

module.exports = function (deployer, network, accounts) {
    deployer.deploy(Contract);
}