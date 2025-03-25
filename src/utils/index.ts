// Basic auth
export async function authenticate(request: Request, env: Env) {
	const authHeader = request.headers.get('Authorization')
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return false
	}
	const token = authHeader.split(' ')[1]
	return token === env.API_TOKEN
}

// Rate limiter
export async function checkRateLimit(request: Request, env: Env): Promise<Response | null> {
	const clientIP = request.headers.get('cf-connecting-ip');
	if (!clientIP) return null;

	const rateLimitKey = `ratelimit:${clientIP}`;
	const currentRequests = parseInt((await env.KV.get(rateLimitKey)) || '0');

	await env.KV.put(rateLimitKey, (currentRequests + 1).toString(), {
		expirationTtl: 60,
	})

	if (currentRequests > 500) {
		return new Response('Rate limit exceeded', { status: 429 });
	}

	await env.KV.put(rateLimitKey, (currentRequests + 1).toString(), { expirationTtl: 60 });
	return null; // No rate limit exceeded
}