import { ethers } from 'hardhat';
import { Contract, ContractFactory } from 'ethers';

async function main(): Promise<void> {
  const EwwOracleFactory: ContractFactory = await ethers.getContractFactory(
    'EwwOracle',
  );
  const ewwOracle: Contract = await EwwOracleFactory.deploy();
  await ewwOracle.deployed();
  console.log('EwwOracle deployed to: ', ewwOracle.address);
}

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
