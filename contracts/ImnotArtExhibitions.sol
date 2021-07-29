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
    address public imnotArtPayoutAddress;
    address public marketplaceAddress;
    string private _contractUri;

    // ---
    // Structs
    // ---

    /* Interface for Rarible that can be used for other things in future */
    struct RoyaltyBps {
        address payable account;
        uint96 value;
    }

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
    mapping(uint256 => address) public artistByTokenId;
    mapping(uint256 => TokenBps) public tokenBpsByTokenId;
    mapping(uint256 => RoyaltyBps) public royaltyBpsByTokenId;

    // ---
    // Constructor
    // ---
    constructor() ERC721("imnotArt Exhibitions", "IMNOTART") {
        _isAdmin[msg.sender] = true;
        // @TODO(iolson): Set initial Contract URI
    }

    // ---
    // Minting
    // ---
    function mintToken(address artistAddress, string memory metadataUri, uint16 artistFirstSaleBps, uint16 artistSecondarySaleBps, bool transferToMarketplaceContract) public onlyAdmin returns (uint256 tokenId) {
        tokenId = nextTokenId;
        nextTokenId = nextTokenId.add(1);

        _mint(artistAddress, tokenId);
        artistByTokenId[tokenId] = artistAddress;

        _metadataByTokenId[tokenId] = metadataUri;
        emit PermanentURI(metadataUri, tokenId);

        TokenBps memory tokenBps = TokenBps({
            artistFirstSaleBps: artistFirstSaleBps,
            artistSecondarySaleBps: artistSecondarySaleBps
        });
        tokenBpsByTokenId[tokenId] = tokenBps;

        RoyaltyBps memory royaltyBps = RoyaltyBps({
            account: payable(artistAddress),
            value: artistSecondarySaleBps
        });
        royaltyBpsByTokenId[tokenId] = royaltyBps;

        if (transferToMarketplaceContract) {
            _transfer(artistAddress, marketplaceAddress, tokenId);
        }
    }

    // ---
    // Contract Updates
    // ---
    function updateImnotArtPayoutAddress(address newPayoutAddress) public onlyAdmin {
        imnotArtPayoutAddress = newPayoutAddress;
    }

    function updateMarketplaceAddress(address newMarketplaceAddress) public onlyAdmin {
        marketplaceAddress = newMarketplaceAddress;
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
    function getTokensOfOwner(address owner) public view returns (uint256[] memory tokenIds) {
        uint256 tokenCount = balanceOf(owner);

        if (tokenCount == 0) {
            tokenIds = new uint256[](0);
        } else {
            tokenIds = new uint256[](tokenCount);
            uint256 index;
            for (index = 0; index < tokenCount; index++) {
                tokenIds[index] = tokenOfOwnerByIndex(owner, index);
            }
        }

        return tokenIds;
    }

    // ---
    // Secondary Marketplace Functions
    // ---

    /* OpenSea */
    function contractURI() public view virtual returns (string memory) {
        return _contractUri;
    }
    
    /* Rarible */
    function getRoyalties(uint256 id) external view returns (RoyaltyBps[] memory) {
        RoyaltyBps[] memory royalties = new RoyaltyBps[](2);

        // Add Artist Royalties
        royalties[0] = royaltyBpsByTokenId[id];

        // Add imnotArt Royalties
        royalties[1] = RoyaltyBps({
            account: payable(imnotArtPayoutAddress),
            value: 250
        });

        return royalties;
    }
}