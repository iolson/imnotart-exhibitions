// SPDX-License-Identifier: MIT

/*
  _                       _                 _     ______      _     _ _     _ _   _                 
 (_)                     | |     /\        | |   |  ____|    | |   (_) |   (_) | (_)                
  _ _ __ ___  _ __   ___ | |_   /  \   _ __| |_  | |__  __  _| |__  _| |__  _| |_ _  ___  _ __  ___ 
 | | '_ ` _ \| '_ \ / _ \| __| / /\ \ | '__| __| |  __| \ \/ / '_ \| | '_ \| | __| |/ _ \| '_ \/ __|
 | | | | | | | | | | (_) | |_ / ____ \| |  | |_  | |____ >  <| | | | | |_) | | |_| | (_) | | | \__ \
 |_|_| |_| |_|_| |_|\___/ \__/_/    \_\_|   \__| |______/_/\_\_| |_|_|_.__/|_|\__|_|\___/|_| |_|___/
                                                                                                    
 Written by Ian Olson
*/

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./rarible/library/LibPart.sol";
import "./rarible/library/LibRoyaltiesV2.sol";
import "./rarible/RoyaltiesV2.sol";

contract ImnotArtExhibitions is Ownable, ERC721Enumerable, RoyaltiesV2 {
    using SafeMath for uint256;

    // ---
    // Constants
    // ---
    bytes4 private constant _INTERFACE_ID_ERC165 = 0x01ffc9a7;
    bytes4 private constant _INTERFACE_ID_ERC721 = 0x80ac58cd;
    bytes4 private constant _INTERFACE_ID_ERC721_METADATA = 0x5b5e139f;
    bytes4 private constant _INTERFACE_ID_ERC721_ENUMERABLE = 0x780e9d63;
    bytes4 private constant _INTERFACE_ID_EIP2981 = 0x2a55205a;
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
    bool public useRoyaltyContracts;

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
    event Debug(string _value, address royaltyAddress);

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
    mapping(address => address) public royaltyContractByArtistAddress;

    // ---
    // Constructor
    // ---
    constructor() ERC721("imnotArt Exhibitions", "IMNOTART") {
        _isAdmin[msg.sender] = true;
        useRoyaltyContracts = false;
        // imnotArtPayoutAddress = 0xaB5B4e5845B124785027d9944baaFb7f064B3F72; // @TODO(iolson): Proper Production Payout Address
        // _contractUri = "ipfs://bafkreigrkm4ta353qumma6g6fpfg7mbnhyuyckdy2hi6udc5ov5asjcsiu"; // @TODO(iolson): Proper Production Contract URI
    }

    // ---
    // Supported Interfaces
    // ---
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == _INTERFACE_ID_ERC165
        || interfaceId == LibRoyaltiesV2._INTERFACE_ID_ROYALTIES
        || interfaceId == _INTERFACE_ID_ERC721
        || interfaceId == _INTERFACE_ID_ERC721_METADATA
        || interfaceId == _INTERFACE_ID_ERC721_ENUMERABLE
        || interfaceId == _INTERFACE_ID_EIP2981
        || super.supportsInterface(interfaceId);
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

    function updateTokenMetadata(uint256 tokenId, string memory metadataUri, bool permanent) public onlyOwner onlyValidTokenId(tokenId) {
        _metadataByTokenId[tokenId] = metadataUri;

        if (permanent) {
            emit PermanentURI(metadataUri, tokenId);
        }
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

    function toggleUseRoyaltyContracts() public onlyAdmin {
        useRoyaltyContracts = !useRoyaltyContracts;
    }

    function addRoyaltyContractAddress(address artistAddress, address royaltyContractAddress) public onlyAdmin {
        royaltyContractByArtistAddress[artistAddress] = royaltyContractAddress;
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
    function getTokensOfOwner(address _owner) public view returns (uint256[] memory tokenIds) {
        uint256 tokenCount = balanceOf(_owner);

        if (tokenCount == 0) {
            tokenIds = new uint256[](0);
        } else {
            tokenIds = new uint256[](tokenCount);
            uint256 index;
            for (index = 0; index < tokenCount; index++) {
                tokenIds[index] = tokenOfOwnerByIndex(_owner, index);
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

    /* Rarible Royalties V2 */
    function getRaribleV2Royalties(uint256 tokenId) external view override onlyValidTokenId(tokenId) returns (LibPart.Part[] memory) {
        LibPart.Part[] memory royalties = new LibPart.Part[](2);
        
        royalties[0] = LibPart.Part({
            account: payable(artistByTokenId[tokenId]),
            value: uint96(artistSecondarySaleBps)
        });

        royalties[1] = LibPart.Part({
            account: payable(imnotArtPayoutAddress),
            value: uint96(imnotArtSecondarySaleBps)
        });

        return royalties;
    }

    /* EIP-2981 - https://eips.ethereum.org/EIPS/eip-2981 */
    function royaltyInfo(uint256 tokenId, uint256 salePrice) external view onlyValidTokenId(tokenId) returns (address receiver, uint256 amount) {
        address artistAddress = artistByTokenId[tokenId];
        uint256 combinedBpsForSinglePayout = uint256(artistSecondarySaleBps).add(uint256(imnotArtSecondarySaleBps));
        uint256 royaltyAmount = SafeMath.div(SafeMath.mul(salePrice, combinedBpsForSinglePayout), 10000);

        address payoutAddress = imnotArtPayoutAddress;
        
        if (useRoyaltyContracts) {
            payoutAddress = royaltyContractByArtistAddress[artistAddress];
        }

        if (payoutAddress == address(0)) {
            payoutAddress = imnotArtPayoutAddress;
        }

        return (payoutAddress, royaltyAmount);
    }
}