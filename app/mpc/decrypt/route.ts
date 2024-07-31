import { NextResponse } from 'next/server'
import { decrypt } from '@toruslabs/eccrypto'

export async function POST(request: Request) {
	if(!process.env.NODE_PRIVATE_KEY){
		return NextResponse.json({ error: 'Node private key is required' }, { status: 400 })
	}
	const { encryptedShare } = await request.json()
	const decryptedShare = await decrypt(Buffer.from(process.env.NODE_PRIVATE_KEY, 'base64'), {
		iv: Buffer.from(encryptedShare.iv, 'base64'),
		ephemPublicKey: Buffer.from(encryptedShare.ephemPublicKey, 'base64'),
		ciphertext: Buffer.from(encryptedShare.ciphertext, 'base64'),
		mac: Buffer.from(encryptedShare.mac, 'base64')
	})
  
	return NextResponse.json({ decryptedShare: decryptedShare.toString('base64') })
}