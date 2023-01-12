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
    const name = 'myworld';
    const mainNode = 'mainNode1';
    const chainId = 1;
    const id = 1;
    await contract.add(name, mainNode, chainId);
    return { contract, deployer, name, mainNode, chainId, id, receiver };
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
    const { contract, name } = await addWorld();
    await expect(contract.add(name, "mainNode", 123))
      .to.be.revertedWith('Name must be unique');
  });

  it('should fail add a new world caused by whitelist', async () => {
    const { contract, receiver } = await addWorld();
    await expect(contract.connect(receiver).add("reverted", "mainNode", 123))
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

  it('should get world version', async () => {
    const { contract, id } = await addWorld();
    const version = await contract.version(id);

    expect(version.toNumber()).to.eq(0);
  });

  it('should update a world', async () => {
    const { contract, deployer, name, id } = await addWorld();
    const newVersion = 2;
    const newNode = "new-node.io/v1";
    const newChainId = 100;
    await contract.update(id, newChainId, newVersion, newNode);

    const updatedWorld = await contract.getByName(name);
    const exprectedVersion = await contract.version(id);
    expect(updatedWorld[0].toNumber()).to.eq(id);
    expect(updatedWorld[1]).to.eq(name);
    expect(updatedWorld[3]).to.eq(deployer.address);
    // updates
    expect(updatedWorld[2].toNumber()).to.eq(newChainId);
    expect(updatedWorld[4]).to.eq(newNode);
    expect(exprectedVersion.toNumber()).to.eq(newVersion);
  });

  it('should only allow the owner to update a world', async () => {
    const { contract, receiver, id } = await addWorld();
    await expect(contract.connect(receiver).update(id, 2, 2, "change"))
      .to.be.revertedWith('Only owner can update world');
  });

  it('should transfer ownership of a world', async () => {
    const { contract, name, id, receiver } = await addWorld();
    await contract.transfer(receiver.address, id);

    const updatedWorld = await contract.getByName(name);
    expect(updatedWorld[3], receiver.address);
    expect(contract.ownerOf(id), receiver.address);
  });
});
