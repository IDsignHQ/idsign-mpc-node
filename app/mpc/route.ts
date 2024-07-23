import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {


	const resp = {
		status: 'OK',
		node_id: process.env.NODE_ID || 'localhost',
		vercel_url: process.env.VERCEL_URL || 'localhost'
	}

	return new Response(JSON.stringify(resp), {
		status: 200,
		headers: {
			'Content-Type': 'application/json'
		}
	})
}