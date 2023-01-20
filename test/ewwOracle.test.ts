import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("Token", () => {
  async function deployContracts() {
    const [deployer, sender, receiver] = await ethers.getSigners();
    const tokenFactory = await ethers.getContractFactory("EwwOracle");
    let contract = await tokenFactory.deploy();
    expect(await contract.worldCount()).to.be.eq(0);
    return { deployer, sender, receiver, contract };
  }

  async function addWorld() {
    let { contract, deployer, receiver } = await loadFixture(deployContracts);
    const [addr1] = await ethers.getSigners();

    const contractBlockchainXy = addr1.address;
    const name = 'myworld';
    const mainNode = 'mainNode1';
    const chainId = 1;
    const id = 1;
    await contract.add(name, mainNode, chainId, contractBlockchainXy);
    return { contract, deployer, name, mainNode, chainId, id, receiver, contractBlockchainXy };
  }

  it('should add a new world', async () => {
    const { contract, deployer, name, mainNode, chainId, id } = await addWorld();
    const world = await contract.getByName(name);
    expect(world[0].toNumber()).to.eq(id);
    expect(world[1]).to.eq(name);
    expect(world[2].toNumber()).to.eq(chainId);
    expect(world[3]).to.eq(deployer.address);
    expect(world[4]).to.eq(mainNode);
  });

  it('should fail add a new world caused by unique name', async () => {
    const { contract, name, contractBlockchainXy } = await addWorld();
    await expect(contract.add(name, "mainNode", 123, contractBlockchainXy))
      .to.be.revertedWith('Name must be unique');
  });

  it('should fail add a new world caused by whitelist', async () => {
    const { contract, receiver, contractBlockchainXy } = await addWorld();
    await expect(contract.connect(receiver).add("reverted", "mainNode", 123, contractBlockchainXy))
      .to.be.revertedWith('Sender address is not in the whitelist');
  });

  it('should get world by name', async () => {
    const { contract, name, id } = await addWorld();
    const world = await contract.getByName(name);
    expect(world[0].toNumber()).to.eq(id);
    expect(world[1]).to.eq(name);
  });

  it('should get world by id', async () => {
    const { contract, name, id } = await addWorld();
    const world = await contract.getById(id);
    expect(world[0].toNumber()).to.eq(id);
    expect(world[1]).to.eq(name);
  });

  it('should get world names', async () => {
    const { contract, name } = await addWorld();
    const names = await contract.worldNames();
    expect(names.length).to.eq(1);
    expect(names[0]).to.eq(name);
  });

  it('should update a world', async () => {
    const { contract, deployer, name, id, contractBlockchainXy } = await addWorld();
    const newNode = "new-node.io/v1";
    const newChainId = 100;
    await contract.update(id, newChainId, newNode, contractBlockchainXy);

    const updatedWorld = await contract.getByName(name);
    expect(updatedWorld[0].toNumber()).to.eq(id);
    expect(updatedWorld[1]).to.eq(name);
    expect(updatedWorld[3]).to.eq(deployer.address);
    // updates
    expect(updatedWorld[2].toNumber()).to.eq(newChainId);
    expect(updatedWorld[4]).to.eq(newNode);
  });

  it('should only allow the owner to update a world', async () => {
    const { contract, receiver, id, contractBlockchainXy } = await addWorld();
    await expect(contract.connect(receiver).update(id, 2, "change", contractBlockchainXy))
      .to.be.revertedWith('Only owner can update world');
  });

  it('should transfer ownership of a world', async () => {
    const { contract, name, id, receiver } = await addWorld();
    await contract.transfer(receiver.address, id);

    const updatedWorld = await contract.getByName(name);
    expect(updatedWorld[3], receiver.address);
    expect(contract.ownerOf(id), receiver.address);
  });

  // Comment in for testing
  // it("should mint a special world", async () => {
  //   const { contract } = await addWorld();
  //   const [deployer] = await ethers.getSigners();
  //   await contract.connect(deployer).addSpecialImgSource("specialSource");
  //   let worldId;

  //   const sevenDays = 7 * 24 * 60 * 60;

  //   // Keep adding worlds until a special world is minted
  //   let hasSpecialWorld = false;
  //   let i = 0;
  //   while (!hasSpecialWorld) {
  //     await contract.add("world" + i, "mainNode", i, contract.address);
  //     const specialWorldCount = await contract.specialWorldsCount();
  //     console.log("generated: ", specialWorldCount);
  //     worldId = i;
  //     hasSpecialWorld = specialWorldCount.toNumber() > 0;
  //     await ethers.provider.send('evm_increaseTime', [sevenDays]);
  //     await ethers.provider.send('evm_mine', []);
  //     i++;
  //   }

  //   // Check that the world that was minted is special
  //   expect(await contract.tokenURI(worldId ?? 1), "specialSource");
  // });

  it('should return the correct token URI', async () => {
    const { contract, id } = await addWorld();
    const tokenURI = await contract.tokenURI(id);
    expect(tokenURI).to.eq(`https://ipfs.io/${await contract.generalImgSource()}`);
  });

  it('should add an address to the whitelist', async () => {
    let { contract, receiver } = await loadFixture(deployContracts);
    expect(await contract.whitelist(receiver.address)).to.be.false;
    await contract.addToWhitelist(receiver.address);
    expect(await contract.whitelist(receiver.address)).to.be.true;
  });

  it('should fail add an address to the whitelist caused by Address is already in the whitelist', async () => {
    let { contract, receiver } = await loadFixture(deployContracts);
    await contract.addToWhitelist(receiver.address);

    await expect(contract.addToWhitelist(receiver.address))
      .to.be.revertedWith('Address is already in the whitelist');
  });

});
