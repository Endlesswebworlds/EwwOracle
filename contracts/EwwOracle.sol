// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@ensdomains/ens-contracts/contracts/ethregistrar/StringUtils.sol";

contract EwwOracle is ERC721, Ownable {
    struct World {
        uint256 id;
        string name;
        string mainNode;
        uint256 chainId;
        address chainContract;
        address owner;
    }

    mapping(address => bool) public whitelist; // whitelist of addresses that can create worlds
    mapping(uint256 => World) public worldsById; // id => world
    mapping(string => uint256) public worldIdsByName; // name => id

    uint256 public specialImgSourcesCount = 0;
    uint256 public specialWorldsCount = 0;
    mapping(uint256 => string) public specialImgSources; // all special image sources
    mapping(uint256 => string) public specialImgSourceOfWorld; // worldId => ipfs special source for rare worlds
    event SpecialWorldMinted(uint256 worldId, string imgSource);

    uint256 public worldCount = 0;
    string public ipfsProviderSource = "https://ipfs.io/";
    string public generalImgSource = "bafybeigwkm3sisrrdwkjvokfqzboyqu6bqnowlk2mxkby3aa7fh7nyx32i"; // Basic world ipfs hash img
    uint256 private _maxNameLength = 100;

    constructor() ERC721("EndlessWebWorld", "EWWorld") {
        whitelist[msg.sender] = true;
    }

    function changeIpfsProvider(string memory _ipfsProviderSource) public payable onlyOwner {
        ipfsProviderSource = _ipfsProviderSource;
    }

    function addSpecialImgSource(string memory imgSource) public payable onlyOwner {
        specialImgSourcesCount += 1;
        specialImgSources[specialImgSourcesCount] = imgSource;
    }

    function raffleSpecalWorldMint(uint256 worldId) private {
        if (specialImgSourcesCount == 0) {
            return;
        }

        uint256 randomNumber = uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty))) % 20000;
        if (randomNumber == 0) {
            uint256 selectedIndex = uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty))) %
                specialImgSourcesCount;

            specialImgSourceOfWorld[worldId] = specialImgSources[selectedIndex + 1];
            specialWorldsCount += 1;
            emit SpecialWorldMinted(worldId, specialImgSources[selectedIndex + 1]);
        }
    }

    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        string memory imgSource;
        if (bytes(specialImgSourceOfWorld[_tokenId]).length != 0) {
            imgSource = specialImgSourceOfWorld[_tokenId];
        } else {
            imgSource = generalImgSource;
        }

        return string(abi.encodePacked(ipfsProviderSource, imgSource));
    }

    function addToWhitelist(address _address) public payable onlyOwner {
        require(whitelist[_address] == false, "Address is already in the whitelist");
        whitelist[_address] = true;
    }

    function removeFromWhitelist(address _address) public payable onlyOwner {
        whitelist[_address] = false;
    }

    function update(
        uint256 _id,
        uint256 _chainId,
        string memory _mainNode,
        address _chainContract
    ) public payable {
        World storage world = worldsById[_id];
        require(msg.sender == world.owner, "Only owner can update world");
        world.chainId = _chainId;
        world.mainNode = _mainNode;
        world.chainContract = _chainContract;
    }

    function add(
        string memory _name,
        string memory _mainNode,
        uint256 _chainId,
        address _chainContract
    ) public payable {
        require(StringUtils.strlen(_name) <= _maxNameLength, "Name exceeds max length of 300 characters");
        require(bytes(_name).length != 0, "Name must be provided");
        require(worldIdsByName[_name] == 0, "Name must be unique");
        require(whitelist[msg.sender] == true, "Sender address is not in the whitelist");

        worldCount += 1;
        World memory newWorld = World({
            id: worldCount,
            name: _name,
            chainId: _chainId,
            owner: msg.sender,
            mainNode: _mainNode,
            chainContract: _chainContract
        });

        raffleSpecalWorldMint(worldCount);

        worldsById[worldCount] = newWorld;
        worldIdsByName[_name] = worldCount;
        _safeMint(msg.sender, worldCount);
    }

    function getById(uint256 _id)
        public
        view
        returns (
            uint256,
            string memory,
            uint256,
            address,
            string memory,
            address
        )
    {
        World storage world = worldsById[_id];
        return (world.id, world.name, world.chainId, world.owner, world.mainNode, world.chainContract);
    }

    function getByName(string memory _name)
        public
        view
        returns (
            uint256,
            string memory,
            uint256,
            address,
            string memory,
            address
        )
    {
        uint256 id = worldIdsByName[_name];
        World storage world = worldsById[id];
        return (world.id, world.name, world.chainId, world.owner, world.mainNode, world.chainContract);
    }

    function worldNames() public view returns (string[] memory) {
        string[] memory names = new string[](worldCount);
        for (uint256 i = 0; i < worldCount; i++) {
            names[i] = worldsById[i + 1].name;
        }
        return names;
    }

    function transfer(address _to, uint256 _tokenId) public payable {
        require(_isApprovedOrOwner(msg.sender, _tokenId), "Sender is not owner or approved");
        super._transfer(msg.sender, _to, _tokenId);
        World storage world = worldsById[_tokenId];
        world.owner = _to;
    }
}
