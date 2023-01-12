// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@ensdomains/ens-contracts/contracts/ethregistrar/StringUtils.sol";

contract EwwOracle is ERC721 {
    struct World {
        uint256 id;
        string name;
        string mainNode;
        uint256 chainId;
        address chainContract;
        address owner;
    }

    mapping(address => bool) public whitelist;
    mapping(uint256 => World) public worldsById;
    mapping(string => uint256) public worldIdsByName;
    uint256 public worldCount = 0;
    uint256 private _maxNameLength = 100;

    constructor() ERC721("EndlessWebWorld", "EWWorld") {
        whitelist[msg.sender] = true;
    }

    function addToWhitelist(address _address) public {
        require(msg.sender == address(this), "Only contract owner can add to whitelist");
        require(whitelist[_address], "Address is already in the whitelist");
        whitelist[_address] = true;
    }

    function removeFromWhitelist(address _address) public {
        require(msg.sender == address(this), "Only contract owner can remove from whitelist");
        whitelist[_address] = false;
    }

    function update(
        uint256 _id,
        uint256 _chainId,
        string memory _mainNode,
        address _chainContract
    ) public {
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
    ) public {
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

    function transfer(address _to, uint256 _tokenId) public {
        require(_isApprovedOrOwner(msg.sender, _tokenId), "Sender is not owner or approved");
        super._transfer(msg.sender, _to, _tokenId);
        World storage world = worldsById[_tokenId];
        world.owner = _to;
    }
}
