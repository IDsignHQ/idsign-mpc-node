# zkVaults Module (DKMS)
ZK-MPC encrypted secret sharing module enabling the most private decentralized file sharing with no one in the middle, not event idSign; ONLY the wallets added to document can ever reconstruct and decrypt the documents shared via IPFS

---

### TL;DR

Imagine you want to send a secret message or file to someone or to a group of members such as a DAO. With zkVaults, you can encrypt the data on the frontend with a unique generated key and this key gets stored on 3 nodes on an MPC blockchain (partisiablockchain.com) or any Advanced MPC blockchain. The other members can then request the secret key, and decrypt the data that was stored publically but encrypted.

---

### **Objective**: 
Securely share a secret among a predefined set of users/wallets, authorized via their wallet addresses, using zero-knowledge proofs to maintain privacy.

### **Components**:

- **Smart Contract or Decentralized Storage:** For Storing The resourceID, encryptedSecret, and its ACLs (Access Control Lists). These values can be stored publicly leveraging the “no single point of failure” nature of this technology but at the same time ensuring privacy of the stored secret limiting it to a set of authorized users
- **zkVaults module:** For generating a new vault, granting access of a vault to users in its ACLs. This should be implemented through programmable MPC actions leveraging computational rules done by multiple on-chain nodes (zkSmartContract)

### **Use Cases:**

- End-to-end Encrypted on-chain messaging
- Decentralized file-sharing (sharing the decryption key of an encrypted file stored on IPFS)
- Sharing information privately between DAO members
- Token-Gating without relying on a server to “Gate” the resource or the key to the resource
- Many more…

