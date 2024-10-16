import { NextResponse } from 'next/server'
import { decrypt } from '@toruslabs/eccrypto'
import { ethers } from 'ethers'
import {Address, Cell, contractAddress, loadStateInit } from '@ton/ton'

export async function POST(request: Request) {
	if(!process.env.NODE_PRIVATE_KEY){
		return NextResponse.json({ error: 'Node private key is required' }, { status: 400 })
	}
	const { payload, encryptedShare } = await request.json()

	if(payload.chain === 'TON'){
		const stateInit = loadStateInit(Cell.fromBase64(payload.signature).beginParse())
		const wantedAddress = Address.parse(payload.rawaddress)
		const address = contractAddress(wantedAddress.workChain, stateInit)
		if (!address.equals(wantedAddress)) {
			return NextResponse.json({ error: 'Invalid Signature' }, { status: 401 })
		}
	} else { // EVM
		const recoveredAddr = ethers.verifyMessage(payload.timestamp.toString(), payload.signature)
		if (recoveredAddr !== payload.address) {
			return NextResponse.json({ error: 'Invalid Signature' }, { status: 401 })
		}
	}

	if (Date.now() > (payload.timestamp + 5*60*1000)) { return NextResponse.json({ error: 'Error: Signature expired' }, { status: 401 })}

	const authorized = encryptedShare.acls.includes(payload.address)
	if(!authorized) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}
	
	const decryptedShare = await decrypt(Buffer.from(process.env.NODE_PRIVATE_KEY, 'base64'), {
		iv: Buffer.from(encryptedShare.iv, 'base64'),
		ephemPublicKey: Buffer.from(encryptedShare.ephemPublicKey, 'base64'),
		ciphertext: Buffer.from(encryptedShare.ciphertext, 'base64'),
		mac: Buffer.from(encryptedShare.mac, 'base64')
	})
  
	return NextResponse.json({ decryptedShare: decryptedShare.toString('base64') })
}