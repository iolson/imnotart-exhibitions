// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract ImnotArtExhibitions is ERC721Enumerable {
    using SafeMath for uint256;

    // ---
    // Properties
    // ---
    uint256 public nextTokenId = 1;
    address private _imnotArtPayoutAddress;
    address private _imnotArtMarketplaceContract;
    string private _contractUri;

    // ---
    // Structs
    // ---

    /* Only need Artist BPS, as remainder would be given to imnotArt after Artist is paid */
    struct TokenBps {
        uint16 artistFirstSaleBps;
        uint16 artistSecondarySaleBps;
    }

    // ---
    // Events
    // ---
    event PermanentURI(string _value, uint256 indexed _id); // OpenSea Freezing Metadata

    // ---
    // Security
    // ---
    mapping(address => bool) private _isAdmin;

    modifier onlyAdmin() {
        require(_isAdmin[msg.sender], "Only admins.");
        _;
    }

    modifier onlyValidTokenId(uint256 tokenId) {
        require(_exists(tokenId), "Token ID does not exist.");
        _;
    }

    // ---
    // Mappings
    // ---
    mapping(uint256 => string) private _metadataByTokenId;
    mapping(uint256 => address) private _artistByTokenId;
    mapping(uint256 => TokenBps) private _tokenBpsByTokenId;

    // ---
    // Constructor
    // ---
    constructor() ERC721("imnotArt Exhibitions", "IMNOTART") {
        _isAdmin[msg.sender] = true;
        // @TODO(iolson): Set admin(s)
        // @TODO(iolson): Set initial Contract URI
    }

    // ---
    // Minting
    // ---
    function mintToken(address artistAddress, string memory metadataUri, uint16 artistFirstSaleBps, uint16 artistSecondarySaleBps, bool transferToMarketplaceContract) public onlyAdmin returns (uint256 tokenId) {
        tokenId = nextTokenId;
        nextTokenId = nextTokenId.add(1);

        _mint(artistAddress, tokenId);
        _artistByTokenId[tokenId] = artistAddress;

        _metadataByTokenId[tokenId] = metadataUri;
        emit PermanentURI(metadataUri, tokenId);

        TokenBps memory tokenBps = TokenBps({
            artistFirstSaleBps: artistFirstSaleBps,
            artistSecondarySaleBps: artistSecondarySaleBps
        });
        _tokenBpsByTokenId[tokenId] = tokenBps;

        if (transferToMarketplaceContract) {
            // @TODO(iolson): Transfer to the Marketplace Contract to put up for auction?
        }
    }

    // ---
    // Contract Updates
    // ---
    function updateImnotArtPayoutAddress(address newPayoutAddress) public onlyAdmin {
        _imnotArtPayoutAddress = newPayoutAddress;
    }

    function updateContractUri(string memory newContractUri) public onlyAdmin {
        _contractUri = newContractUri;
    }

    function addAdmin(address newAdminAddress) public onlyAdmin {
        _isAdmin[newAdminAddress] = true;
    }

    // ---
    // Metadata
    // ---
    function tokenURI(uint256 tokenId) public view override virtual returns (string memory) {
        return _metadataByTokenId[tokenId];
    }

    // ---
    // Contract Retrieve Functions
    // ---

    // @TODO(iolson): Get Tokens of Owner

    // ---
    // Secondary Marketplace Functions
    // ---

    /* OpenSea */
    function contractURI() public view virtual returns (string memory) {
        return _contractUri;
    }

    /* Rarible */
}