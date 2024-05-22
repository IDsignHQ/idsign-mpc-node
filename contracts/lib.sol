// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";


contract zkVault {


    event log_access (string data_hash); // add timestamp
    event PbcConnectionReset (bytes21 newPbcAddress, address[] newComputationNodes);

    bytes21 public pbcContractAddress;
    address[] public computationNodes;

    mapping(string => address[]) public vaults;

    constructor(bytes21 _pbcContractAddress, address[] memory _computationNodes) {
        pbcContractAddress = _pbcContractAddress;
        require(_computationNodes.length == 4, "Invalid computation node count");
        computationNodes = _computationNodes;
    }

    function request_access(
        string calldata data_hash,
        address[] calldata members,
        bytes[] calldata _sig) external {

        require(_sig.length == 4, "Not enough signatures");

        bytes32 digest = compute_digest(data_hash);
        for (uint32 node = 0; node < 4; node++) {
            bytes calldata signature = _sig[node];
            require(computationNodes[node] == ECDSA.recover(digest, signature),
                "Could not verify signature");
        }

        // (msg.sender, block.timestamp, data_hash);
        emit log_access(data_hash);
        vaults[data_hash] = members;
    }

    function compute_digest(string calldata data_hash) private view returns (bytes32) {
        return sha256(
            abi.encodePacked(
                "ZK_SHARE_IDSIGN_LOG",
                pbcContractAddress,
                data_hash
            ));
    }
}
