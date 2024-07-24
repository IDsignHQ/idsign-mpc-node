import { NextResponse } from 'next/server'
import CryptoJS from 'crypto-js'

export async function POST(request: Request) {
	const { encryptedShare } = await request.json()
  
	const decryptedShare = decryptShare(encryptedShare)
  
	return NextResponse.json({ decryptedShare })
}

function decryptShare(encryptedShare: string): string {
	// Implement decryption using the node's private key
	// This is a placeholder implementation using AES
	const privateKey = process.env.NODE_PRIVATE_KEY || '12qwaszx'
	const bytes = CryptoJS.AES.decrypt(encryptedShare, privateKey)
	return bytes.toString(CryptoJS.enc.Utf8)
}