const {loadFixture} = require("@nomicfoundation/hardhat-network-helpers");
const {expect} = require("chai");
const {revertedWith} = require("@nomicfoundation/hardhat-chai-matchers");

describe("zkVault contract", function() {
  const domainSeparator = "ZK_SHARE_IDSIGN_LOG";
  const pbcContractAddress = "0x030000000000000000000000000000000000424242";
  const pbcAccount1 = "0x000000000000000000000000000000000000002112";
  const pbcAccount2 = "0x000000000000000000000000000000000000001221";

  async function deployzkVaultFixture() {
    let nodes = [];
    let nodeAddresses = [];
    for (let i = 0; i < 4; i++) {
      let testWallet = ethers.Wallet.createRandom();
      nodes[i] = testWallet;
      nodeAddresses[i] = testWallet.address;
    }
    const zkVault = await ethers.getContractFactory("zkVault");

    const [owner, addr1, addr2] = await ethers.getSigners();
    const zkVaultPBC = await zkVault.deploy(pbcContractAddress, nodeAddresses);
    return {
      zkVault,
      zkVaultPBC,
      pbcContractAddress,
      pbcAccount1,
      pbcAccount2,
      nodes,
      nodeAddresses,
      owner,
      addr1,
      addr2,
    };
  }

  describe("Deployment", function() {

    it("Set right pbc contract address", async function() {
      const {pbcContractAddress, zkVaultPBC} = await loadFixture(deployzkVaultFixture);
      expect(await zkVaultPBC.privateVotingPbcAddress()).to.equal(pbcContractAddress);
    });

    it("Set node addresses in the right order", async function() {
      const {nodes, zkVaultPBC} = await loadFixture(deployzkVaultFixture);
      for (let i = 0; i < 4; i++) {
        expect(await zkVaultPBC.computationNodes(i)).to.equal(nodes[i].address);
      }
    });

    it("Deployment fails if not enough node addresses supplied", async function() {
      const {pbcContractAddress, nodeAddresses, zkVault} = await loadFixture(
          deployzkVaultFixture);
      await expect(zkVault.deploy(pbcContractAddress, nodeAddresses.slice(1))).to.be
      .revertedWith("Invalid computation node count");
    });

    it("Deployment fails if too many public keys supplied", async function() {
      const {pbcContractAddress, zkVault} = await loadFixture(
          deployzkVaultFixture);
      let addresses = [];
      for (let i = 0; i < 5; i++) {
        const randomWallet = ethers.Wallet.createRandom();
        addresses[i] = randomWallet.address;
      }
      await expect(zkVault.deploy(pbcContractAddress, addresses)).to.be
      .revertedWith("Invalid computation node count");
    });
  });

  describe("Publishing result", function() {
    it("Publish result of a vote", async function() {
      const {nodes, zkVaultPBC} = await loadFixture(deployzkVaultFixture);
      const data_hash = 'SECRET_DATA_HASH';
      const sig = generateSignature(nodes, pbcContractAddress, data_hash);

      await expect(() => {
        zkVaultPBC.results(0);
      }).to.throw;

      await expect(zkVaultPBC.publishResult(data_hash, sig))
      .to.emit(zkVaultPBC, "log_access")
      .withArgs([data_hash]);

      expect(await zkVaultPBC.results(0)).to.have.members(
          [data_hash]);
    });
  });

  /// Utility and helper methods
  function generateSignature(nodes, contract, data_hash) {
    const digest = attestationDigest(contract, data_hash);
    let shares = [];
    for (let i = 0; i < 4; i++) {
      shares[i] = sign(digest, nodes[i]._signingKey());
    }
    return shares;
  }

  function attestationDigest(contract, data_hash) {
    return ethers.utils.soliditySha256(
        ["string", "bytes21", "string"],
        [domainSeparator, contract, data_hash]);
  }

  function sign(digest, signingKey) {
    const signature = signingKey.signDigest(digest);
    return ethers.utils.joinSignature(signature);
  }
});