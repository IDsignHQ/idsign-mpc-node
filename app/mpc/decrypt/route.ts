import { NextResponse } from 'next/server'
import { decrypt } from '@toruslabs/eccrypto'

export async function POST(request: Request) {
	if(!process.env.NODE_PRIVATE_KEY){
		return NextResponse.json({ error: 'Node private key is required' }, { status: 400 })
	}
	const { encryptedShare } = await request.json()

	const decryptedShare =  await decrypt(Buffer.from(process.env.NODE_PRIVATE_KEY, 'base64'), encryptedShare)
  
	return NextResponse.json({ decryptedShare })
}