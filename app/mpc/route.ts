import { NextRequest } from 'next/server'
import useENV from '../hooks/useENV'

export async function GET(request: NextRequest) {
	const { vercelEnv, vercelUrl, vercelRegion } = useENV()

	return new Response(JSON.stringify({
		environment: vercelEnv,
		url: vercelUrl,
		region: vercelRegion
	}), {
		status: 200,
		headers: {
			'Content-Type': 'application/json'
		}
	})
}