/** @type {import('next').NextConfig} */
  
const nextConfig = {
	reactStrictMode: true,
	transpilePackages: ['@idsign/evm-contracts'],
	async headers() {
		return [
			{
				source: '/mpc/:path*',
				headers: [
					{
						key: 'Access-Control-Allow-Origin',
						value: '*' // Set your origin
					},
					{
						key: 'Access-Control-Allow-Methods',
						value: 'GET, POST, PUT, DELETE, OPTIONS'
					},
					{
						key: 'Access-Control-Allow-Headers',
						value: 'Content-Type, Authorization'
					}
				]
			}
		]
	}
}

module.exports = nextConfig 