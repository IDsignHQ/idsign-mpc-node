import { NextResponse } from 'next/server'
import { secp256k1 } from 'ethereum-cryptography/secp256k1'
import { hexToBytes, bytesToHex } from 'ethereum-cryptography/utils'

export async function POST(request: Request) {
	const { encryptedShare } = await request.json()
  
	const decryptedShare = await decryptShare(encryptedShare)
  
	return NextResponse.json({ decryptedShare })
}

async function decryptShare(encryptedShare: string): Promise<string> {
	const privateKey = process.env.NODE_PRIVATE_KEY
	if (!privateKey) throw new Error('Node private key not set')

	const ephemeralPublicKey = hexToBytes(encryptedShare.slice(0, 66))
	const iv = hexToBytes(encryptedShare.slice(66, 90))
	const encryptedData = hexToBytes(encryptedShare.slice(90))

	// Perform ECDH
	const sharedSecret = secp256k1.getSharedSecret(privateKey, ephemeralPublicKey)
  
	// Use the shared secret to derive an AES key (you might want to use a proper KDF here)
	const aesKey = sharedSecret.slice(0, 32)
  
	// Decrypt the share using AES-GCM
	const decryptedData = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv: iv },
		await crypto.subtle.importKey('raw', aesKey, { name: 'AES-GCM' }, false, ['decrypt']),
		encryptedData
	)
  
	const decoder = new TextDecoder()
	return decoder.decode(decryptedData)
}