import { NextResponse } from 'next/server'
import { split } from 'shamirs-secret-sharing-ts'
import { secp256k1 } from 'ethereum-cryptography/secp256k1'
import { hexToBytes, bytesToHex } from 'ethereum-cryptography/utils'
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
		const [nodeAddress, nodeUrl] = nodes[index]
		return {
			encryptedShare: await encryptShare(JSON.stringify(share), nodeAddress),
			nodeUrl
		}
	}))
  
	// Store the encrypted shares
	await storeShares(key, encryptedShares)
  
	return NextResponse.json({ success: 'true' })
}

async function encryptShare(share: string, publicKeyAddress: string): Promise<string> {
	// Convert the Ethereum address to a public key point
	const publicKeyPoint = secp256k1.ProjectivePoint.fromHex(publicKeyAddress.slice(2))
  
	// Generate an ephemeral key pair
	const ephemeralPrivateKey = secp256k1.utils.randomPrivateKey()
	const ephemeralPublicKey = secp256k1.getPublicKey(ephemeralPrivateKey)
  
	// Perform ECDH
	const sharedSecret = secp256k1.getSharedSecret(ephemeralPrivateKey, publicKeyPoint.toRawBytes())
  
	// Use the shared secret to derive an AES key (you might want to use a proper KDF here)
	const aesKey = sharedSecret.slice(0, 32)
  
	// Encrypt the share using AES-GCM
	const iv = crypto.getRandomValues(new Uint8Array(12))
	const encoder = new TextEncoder()
	const encryptedData = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv: iv },
		await crypto.subtle.importKey('raw', aesKey, { name: 'AES-GCM' }, false, ['encrypt']),
		encoder.encode(share)
	)
  
	// Combine the ephemeral public key, IV, and encrypted data
	return bytesToHex(ephemeralPublicKey) + bytesToHex(iv) + bytesToHex(new Uint8Array(encryptedData))
}

async function storeShares(key: string, shares: { encryptedShare: string, nodeUrl: string }[]) {
	// Implement storage mechanism (e.g., database)
	await kv.set(key, shares)
}