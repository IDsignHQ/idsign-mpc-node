import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { generateNonce } from 'siwe'

export async function POST(request: Request) {
	const { address } = await request.json()
	if (!address) {
		return NextResponse.json({ error: 'Address is required in POST body!' }, { status: 400 })
	}
	
	const nonce = generateNonce()
	const existingSessions: string[] | null = await kv.get(address)
	const sessions = existingSessions ? [nonce, ...existingSessions] : [nonce]
	await kv.set(address, sessions)
  
	return NextResponse.json({ nonce })
}