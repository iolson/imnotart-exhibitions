// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract ImnotArtExhibitions is ERC721Enumerable {
    using SafeMath for uint256;

    // @TODO(iolson): EIP 2981

    // ---
    // Constants
    // ---
    uint16 constant public artistFirstSaleBps = 6500; // 65% of First Sale
    uint16 constant public artistSecondarySaleBps = 500; // 5% of Secondary Sale
    uint16 constant public imnotArtSecondarySaleBps = 250; // 2.5% of Secondary Sale

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
    mapping(address => bool) private _isArtist;

    modifier onlyAdmin() {
        require(_isAdmin[msg.sender], "Only admins.");
        _;
    }

    modifier onlyArtist() {
        require(_isArtist[msg.sender], "Only approved artists.");
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
    function mintToken(address artistAddress, string memory metadataUri, bool transferToMarketplaceContract) public onlyAdmin returns (uint256 tokenId) {
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

        if (transferToMarketplaceContract) {
            _transfer(artistAddress, marketplaceAddress, tokenId);
        }
    }

    function artistMintToken(string memory metadataUri, bool transferToMarketplaceContract) public onlyArtist returns (uint256 tokenId) {
        tokenId = nextTokenId;
        nextTokenId = nextTokenId.add(1);

        _mint(msg.sender, tokenId);
        artistByTokenId[tokenId] = msg.sender;

        _metadataByTokenId[tokenId] = metadataUri;
        emit PermanentURI(metadataUri, tokenId);

        TokenBps memory tokenBps = TokenBps({
            artistFirstSaleBps: artistFirstSaleBps,
            artistSecondarySaleBps: artistSecondarySaleBps
        });
        tokenBpsByTokenId[tokenId] = tokenBps;

        if (transferToMarketplaceContract) {
            _transfer(msg.sender, marketplaceAddress, tokenId);
        }
    }

    // ---
    // Burning
    // ---
    function burn(uint256 tokenId) public virtual onlyArtist {
        //solhint-disable-next-line max-line-length
        require(_isApprovedOrOwner(_msgSender(), tokenId), "Only approved artist owners.");
        _burn(tokenId);
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

    function removeAdmin(address removeAdminAddress) public onlyAdmin {
        _isAdmin[removeAdminAddress] = true;
    }

    function addApprovedArtist(address newArtistAddress) public onlyAdmin {
        _isArtist[newArtistAddress] = true;
    }

    function removeApprovedArtist(address removeArtistAddress) public onlyAdmin {
        _isArtist[removeArtistAddress] = false;
    }

    // ---
    // Metadata
    // ---
    function tokenURI(uint256 tokenId) public view override virtual onlyValidTokenId(tokenId) returns (string memory) {
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
    
    /* Rarible Royalties V1 */
    function getFeeRecipients(uint256 tokenId) public view onlyValidTokenId(tokenId) returns (address payable[] memory) {
        address payable[] memory recipients = new address payable[](2);
        recipients[0] = payable(artistByTokenId[tokenId]);
        recipients[1] = payable(imnotArtPayoutAddress);
        return recipients;
    }

    function getFeeBps(uint256 tokenId) public view onlyValidTokenId(tokenId) returns (uint[] memory) {
        uint256[] memory feeBps = new uint[](2);
        feeBps[0] = uint(artistSecondarySaleBps);
        feeBps[1] = uint(imnotArtSecondarySaleBps);
        return feeBps;
    }
}