import { NextResponse } from 'next/server'
import { split } from 'shamirs-secret-sharing-ts'
import { encrypt } from '@toruslabs/eccrypto'
import { ethers } from 'ethers'
import { kv } from '@vercel/kv'

const DAO_ABI = [{
	inputs: [],
	name: 'getNodes',
	outputs: [
		{
			components: [
				{
					internalType: 'string',
					name: 'pubkey',
					type: 'string'
				},
				{
					internalType: 'string',
					name: 'jsonMetadata',
					type: 'string'
				},
				{
					internalType: 'bool',
					name: 'exists',
					type: 'bool'
				}
			],
			internalType: 'struct DAO.Node[]',
			name: '',
			type: 'tuple[]'
		}
	],
	stateMutability: 'view',
	type: 'function'
}] as const
const DAO_ADDRESS = '0x265118A67e37b601991354222E81E34af4C71Cd6'

export async function POST(request: Request) {
	const { key, value, acls } = await request.json()
	if (!key) {
		return NextResponse.json({ error: 'Key is required in POST body!' }, { status: 400 })
	}
	if (!value) {
		return NextResponse.json({ error: 'Value is required in POST body!' }, { status: 400 })
	}

	const sharesAvailable: any[] | null = await kv.get(key)
	if(sharesAvailable){
		return NextResponse.json({ error: 'Secret shares already available for this key' }, { status: 400 })
	}

	const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com')
	const daoContract = new ethers.Contract(DAO_ADDRESS, DAO_ABI, provider)
  
	const nodes = await daoContract.getNodes()
	const nodesWithBuffers = nodes.map((n:any) => ({
		pub: Buffer.from(n[0], 'base64')
	}))

	const sharesBuffer = split(Buffer.from(value), { threshold: 4, shares: nodes.length })

	const encryptedShares = []
	for (let i = 0; i < sharesBuffer.length; i++) {
		const element = await encrypt(nodesWithBuffers[i].pub, sharesBuffer[i])
		// Store the encrypted data as an object with Buffer properties
		encryptedShares.push({
			acls: acls || [],
			url: nodes[i][1],
			iv: element.iv,
			ephemPublicKey: element.ephemPublicKey,
			ciphertext: element.ciphertext,
			mac: element.mac
		})
	}

	await kv.set(key,encryptedShares)
  
	return NextResponse.json({ success: 'true' })
}
