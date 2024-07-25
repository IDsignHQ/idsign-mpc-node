import { NextResponse } from 'next/server'
import { split } from 'shamirs-secret-sharing-ts'
import CryptoJS from 'crypto-js'
import { ethers } from 'ethers'
import { kv } from '@vercel/kv'

const DAO_ABI = [{
	'inputs': [],
	'name': 'getNodes',
	'outputs': [
		{
			'components': [
				{
					'internalType': 'address',
					'name': 'publicKey',
					'type': 'address'
				},
				{
					'internalType': 'string',
					'name': 'url',
					'type': 'string'
				}
			],
			'internalType': 'struct DAO.Node[]',
			'name': '',
			'type': 'tuple[]'
		}
	],
	'stateMutability': 'view',
	'type': 'function'
}] as const
const DAO_ADDRESS = '0x98BEceee36B6F7e8d26774C80430F411aF28B63c'

export async function POST(request: Request) {
	const { key, value } = await request.json()
  
	// Connect to the network and DAO contract
	const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com')
	const daoContract = new ethers.Contract(DAO_ADDRESS, DAO_ABI, provider)
  
	// Get the list of nodes from the DAO contract
	const nodes = await daoContract.getNodes()
  
	// Generate secret shares
	const shares = split(value, { threshold: 3, shares: nodes.length })
  
	// Encrypt each share with the corresponding node's public key
	const encryptedShares = await Promise.all(shares.map(async (share, index) => {
		const [nodePublicKey, nodeUrl] = nodes[index]
		return {
			encryptedShare: encryptShare(JSON.stringify(share), nodePublicKey),
			nodeUrl
		}
	}))
  
	// // Store the encrypted shares (you'll need to implement this)
	await storeShares(key, encryptedShares)
  
	return NextResponse.json({ success: 'true' })
}

function encryptShare(share: string, publicKey: string): string {
	// Implement encryption using the node's public key
	// This is a placeholder implementation using AES
	return CryptoJS.AES.encrypt(share, publicKey).toString()
}

async function storeShares(key: string, shares: { encryptedShare: string, nodeUrl: string }[]) {
	// Implement storage mechanism (e.g., database)
	await kv.set(key, shares)
}