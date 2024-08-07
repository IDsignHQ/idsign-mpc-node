import { NextResponse } from 'next/server'
import { combine } from 'shamirs-secret-sharing-ts'
import axios from 'axios'
import { kv } from '@vercel/kv'
import { ethers } from 'ethers'


export async function POST(request: Request) {
	try{
		const { key, signature, message } = await request.json()

		if (!key) {
			return NextResponse.json({ error: 'Key is required in POST body!' }, { status: 400 })
		}
		if (!signature) {
			return NextResponse.json({ error: 'Signature is required in POST body!' }, { status: 400 })
		}
		if (!message) {
			return NextResponse.json({ error: 'Message via siwe prepareMessage is required in POST body!' }, { status: 400 })
		}
		const recoveredAddr = ethers.verifyMessage(message,signature)

		const session: string[] | null = await kv.get(recoveredAddr)
		if(!session){
			return NextResponse.json({ error: 'Session nonce not found!' }, { status: 400 })
		}

		const nonce = session[0]
		const isSignatureValid = JSON.parse(message).nonce === nonce
		if(!isSignatureValid){
			return NextResponse.json({ error: 'Invalid Signature nonce!' }, { status: 400 }) // TODO: check date also
		}

		const encryptedShares: any[] | null = await kv.get(key)
		if(!encryptedShares){
			return NextResponse.json({ error: 'Secret shares not found or corrupted!' }, { status: 400 })
		}
		const selectedShares = encryptedShares.sort(() => 0.5 - Math.random()).slice(0, 4)
		const authorized = selectedShares[0].acls.includes(recoveredAddr) // TODO: onchain validation based on conditions (examples: has NFT, isDAOMember, has min 5 tokens, etc.) 
		if(!authorized){
			return NextResponse.json({ error: 'Authentication failed: account not authorized to recover secret!' }, { status: 400 })
		}

		const decryptedShares = []
		for (let j = 0; j < selectedShares.length; j++) {
			const response = await axios.post(`https://${selectedShares[j].url}/mpc/decrypt`, { encryptedShare:selectedShares[j] })
			const element = response.data.decryptedShare
			decryptedShares.push(Buffer.from(element,'base64'))
		}

		const recovered = combine(decryptedShares).toString()

		return NextResponse.json({ recovered })
	} catch(error) {
		return NextResponse.json({ error }, { status: 400 })
	}
}