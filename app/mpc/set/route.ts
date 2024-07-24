import { NextResponse } from 'next/server'
import { split } from 'shamirs-secret-sharing-ts'
import CryptoJS from 'crypto-js'
import { ethers } from 'ethers'
import { DAO__factory } from '@idsign/smart-contracts'

const DAO_ABI = DAO__factory.abi
const DAO_ADDRESS = '0x564Be7B72e91d54E1617AFc6cAa8670986B4C440'

export async function POST(request: Request) {
	const { key, value } = await request.json()
  
	// Connect to the network and DAO contract
	const provider = new ethers.JsonRpcProvider()
	const daoContract = new ethers.Contract(DAO_ADDRESS, DAO_ABI, provider)
  
	// Get the list of nodes from the DAO contract
	const nodes = await daoContract.getNodes()
  
	// Generate secret shares
	const shares = split(value, { threshold: 3, shares: nodes.length })
  
	// Encrypt each share with the corresponding node's public key
	const encryptedShares = await Promise.all(shares.map(async (share, index) => {
		const [nodePublicKey, nodeUrl] = nodes[index]
		return {
			encryptedShare: encryptShare(share, nodePublicKey),
			nodeUrl
		}
	}))
  
	// Store the encrypted shares (you'll need to implement this)
	await storeShares(key, encryptedShares)
  
	return NextResponse.json({ success: true })
}

function encryptShare(share: string, publicKey: string): string {
	// Implement encryption using the node's public key
	// This is a placeholder implementation using AES
	return CryptoJS.AES.encrypt(share, publicKey).toString()
}

async function storeShares(key: string, shares: { encryptedShare: string, nodeUrl: string }[]) {
	// Implement storage mechanism (e.g., database)
}