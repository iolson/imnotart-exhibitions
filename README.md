# imnotArt Exhibitions Contract

## Overview of Exhibitions Contract
This is going to be the foundation of the __imnotArt Exhibitions__ contract that we will use for all our exhibitions at the physical gallery located in Chicago, Illinois, USA.

## Future of Exhibitions Contract
We are trying to think about future proofing this contract with small updates. These updates would include the ability to transfer to our own marketplace contract that would take care of sales on our own platform instead of utilizing OpenSea or something else. We are also leaving some updatable fields available in terms of secondary sales and auto-payments for those secondary sales. Not all current secondary markets give all the proper metadata of paying out the proper artists for their work, but that could change in the future.

# Development Environment
- Node
- NPM
- [Truffle](https://www.trufflesuite.com/truffle)
- [Ganache](https://www.trufflesuite.com/ganache)

## Development Commands
- `truffle compile` - Compiles Contracts
- `truffle migrate` - Runs migrations to the Blockchain
- `truffle run contract-size` - Outputs contract sizes since there are limits.
- `truffle test` - Runs the tests for the contracts