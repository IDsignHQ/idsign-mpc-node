import { NextResponse } from 'next/server'
import { combine } from 'shamirs-secret-sharing-ts'
import { ethers } from 'ethers'
import axios from 'axios'
import { DAO__factory } from '@idsign/smart-contracts'

const DAO_ABI = DAO__factory.abi
const DAO_ADDRESS = '0x564Be7B72e91d54E1617AFc6cAa8670986B4C440'

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url)
	const key = searchParams.get('key')
  
	if (!key) {
		return NextResponse.json({ error: 'Key is required' }, { status: 400 })
	}
  
	// Connect to the network and DAO contract
	const provider = new ethers.JsonRpcProvider()
	const daoContract = new ethers.Contract(DAO_ADDRESS, DAO_ABI, provider)
  
	// Get the list of nodes from the DAO contract
	const nodes = await daoContract.getNodes()
  
	// Retrieve encrypted shares (you'll need to implement this)
	const encryptedShares = await getEncryptedShares(key)
  
	// Randomly select 4 nodes
	const selectedNodes = selectRandomNodes(nodes, 4)
  
	// Request share decryption from selected nodes
	const decryptedShares = await Promise.all(selectedNodes.map(async ([nodePublicKey, nodeUrl]) => {
		const encryptedShare = encryptedShares.find(s => s.nodeUrl === nodeUrl)?.encryptedShare
		if (!encryptedShare) {
			throw new Error(`No share found for node ${nodeUrl}`)
		}
		return requestShareDecryption(nodeUrl, encryptedShare)
	}))
  
	// Combine the decrypted shares to reconstruct the secret
	const secret = combine(decryptedShares)
  
	return NextResponse.json({ value: secret })
}

async function getEncryptedShares(key: string): Promise<{ encryptedShare: string, nodeUrl: string }[]> {
	// Implement retrieval mechanism (e.g., database)
	return []
}

function selectRandomNodes(nodes: [string, string][], count: number): [string, string][] {
	return nodes.sort(() => 0.5 - Math.random()).slice(0, count)
}

async function requestShareDecryption(nodeUrl: string, encryptedShare: string): Promise<string> {
	try {
		const response = await axios.post(`${nodeUrl}/api/decrypt`, { encryptedShare })
		return response.data.decryptedShare
	} catch (error) {
		console.error(`Error requesting share decryption from ${nodeUrl}:`, error)
		throw error
	}
}