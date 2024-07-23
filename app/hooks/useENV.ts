const useEnv = () => {
	const vercelEnv = process.env.VERCEL_ENV || 'development'
	const vercelUrl = process.env.VERCEL_URL || 'localhost'
	const vercelRegion = process.env.VERCEL_REGION || 'local'

	return {
		vercelEnv,
		vercelUrl,
		vercelRegion
	}
}

export default useEnv
