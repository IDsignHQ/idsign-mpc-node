import { NextResponse } from 'next/server'
import { combine } from 'shamirs-secret-sharing-ts'
import axios from 'axios'
import { kv } from '@vercel/kv'


export async function POST(request: Request) {
	const { key } = await request.json()
  
	if (!key) {
		return NextResponse.json({ error: 'Key is required' }, { status: 400 })
	}
  
	// Retrieve encrypted shares
	const encryptedShares: any = await kv.get(key)
  
	// Randomly select 4 nodes
	const selectedNodes = encryptedShares.sort(() => 0.5 - Math.random()).slice(0, 4)
  
	// Request share decryption from selected nodes
	const decryptedShares = await Promise.all(selectedNodes.map(async (n: any) => {
		return requestShareDecryption(n.nodeUrl, n.encryptedShare)
	}))
  
	// Combine the decrypted shares to reconstruct the secret
	const secret = combine(decryptedShares.map(s => JSON.parse(s)))
  
	return NextResponse.json({ secret })
}

async function requestShareDecryption(nodeUrl: string, encryptedShare: string): Promise<string> {
	try {
		const response = await axios.post(`${nodeUrl}mpc/decrypt`, { encryptedShare })
		return response.data.decryptedShare
	} catch (error) {
		console.error(`Error requesting share decryption from ${nodeUrl}:`, error)
		throw error
	}
}