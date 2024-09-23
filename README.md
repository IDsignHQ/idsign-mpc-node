# zkVaults MPC Node 
ZK-MPC encrypted secret sharing module enabling the most private decentralized file sharing with no one in the middle, not event idSign; ONLY the wallets added to document can ever reconstruct and decrypt the documents shared via IPFS

---
### One-Click Deploy

Deploy the example using [Vercel](https://vercel.com):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fidsignhq%2Fzk-mpc-node%2Ftree%2Fmain&project-name=idsign-zk-mpc-node&repository-name=idsign-zk-mpc-node&demo-title=idSign%20ZK%20MPC%20Node&demo-description=Validator%20Node%20idsign%20MPC&demo-url=https%3A%2F%2Fapp.idsign.com%2F&demo-image=https%3A%2F%2Fapp.idsign.com%2Fog.png&stores=%5B%7B"type"%3A"kv"%7D%5D)


---

### **Objective**: 
Securely share a secret among a predefined set of users/wallets, authorized via their wallet addresses, using zero-knowledge proofs to maintain privacy.

### **Components**:

- **Smart Contract or Decentralized Storage:** For Storing The resourceID, encryptedSecret, and its ACLs (Access Control Lists). These values can be stored publicly leveraging the “no single point of failure” nature of this technology but at the same time ensuring privacy of the stored secret limiting it to a set of authorized users
- **zkVaults module:** For generating a new vault, granting access of a vault to users in its ACLs. This should be implemented through programmable MPC actions leveraging computational rules done by multiple on-chain nodes (zkSmartContract)

### **Use Cases:**

- End-to-end Encrypted on-chain secret sharing
- Decentralized file-sharing (sharing access for an encrypted file stored on IPFS)
- Sharing information privately between DAO members
- Token-Gating without relying on a server to own, or “Gate”, the resource or data
- Many more…

