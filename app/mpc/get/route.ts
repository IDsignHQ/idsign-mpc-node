import { NextResponse } from 'next/server'
import { combine } from 'shamirs-secret-sharing-ts'
import axios from 'axios'
import { kv } from '@vercel/kv'


export async function POST(request: Request) {
	const { key } = await request.json()
	if (!key) {
		return NextResponse.json({ error: 'Key is required' }, { status: 400 })
	}

	const encryptedShares: any[] | null = await kv.get(key)
	if(!encryptedShares){
		return NextResponse.json({ error: 'Shares not found' }, { status: 400 })
	}

	const selectedShares = encryptedShares.sort(() => 0.5 - Math.random()).slice(0, 4)
	const decryptedShares = []
	for (let j = 0; j < selectedShares.length; j++) {
		const response = await axios.post(`https://${selectedShares[j].url}/mpc/decrypt`, { encryptedShare:selectedShares[j] })
		const element = response.data.decryptedShare
		decryptedShares.push(Buffer.from(element,'base64'))
	}

	const recovered = combine(decryptedShares).toString()

	return NextResponse.json({ recovered })
}