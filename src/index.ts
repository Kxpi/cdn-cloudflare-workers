/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { checkRateLimit, authenticate } from "./utils";

// GET
async function handleFetch(request: Request, env: Env) {
	try {
		// check rate limit
		const rateLimitResponse = await checkRateLimit(request, env);
		if (rateLimitResponse) return rateLimitResponse;

		// check auth
		if (env.REQUIRE_AUTH_GET === 'true') {
			const authorized = await authenticate(request, env)
			if (!authorized) {
				return new Response('Unauthorized', { status: 401 })
			}
		}

		const url = new URL(request.url)
		const path = url.pathname.slice(1)

		const object = await env.BUCKET.get(path)

		if (!object) {
			return new Response('Resource not found', { status: 404 })
		}

		const headers = new Headers()
		headers.set('Cache-Control', 'public, max-age=31536000')
		headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg')

		return new Response(object.body, {
			headers
		})
	} catch (err) {

		console.error('Error serving image:', err)
		return new Response('Error processing image', {
			status: 500,
			headers: {
				'Content-Type': 'text/plain',
			},
		})
	}
}

// PUT
async function handleUpload(request: Request, env: Env): Promise<Response> {

	try {
		// check rate limit
		const rateLimitResponse = await checkRateLimit(request, env);
		if (rateLimitResponse) return rateLimitResponse;

		// check auth
		if (env.REQUIRE_AUTH_PUT === 'true') {
			const authorized = await authenticate(request, env)
			if (!authorized) {
				return new Response('Unauthorized', { status: 401 })
			}
		}

		if (!request.body) {
			return new Response('No file uploaded', { status: 400 });
		}

		const url = new URL(request.url);
		const filename = url.searchParams.get('filename');
		if (!filename) {
			return new Response('Missing filename parameter', { status: 400 });
		}

		// Determine content type
		const contentType = request.headers.get('Content-Type') || 'application/octet-stream';

		// Store file in R2 bucket
		await env.BUCKET.put(filename, request.body, { httpMetadata: { contentType } });

		return new Response(`File ${filename} uploaded successfully`, { status: 200 });

	} catch (err) {

		console.error('Error serving image:', err)
		return new Response('Error processing image', {
			status: 500,
			headers: {
				'Content-Type': 'text/plain',
			},
		})
	}
}

// Main - wrapper
async function main(request: Request, env: Env): Promise<Response> {
	try {

		const url = new URL(request.url);

		if (url.pathname === "/upload" && request.method === "PUT") {
			return handleUpload(request, env);
		}

		if (request.method === 'GET') {
			return handleFetch(request, env);
		}

		return new Response('Method Not Allowed', { status: 405 });
	} catch (err) {
		console.error('Error:', err);
		return new Response('Internal Server Error', { status: 500 });
	}
}

export default { fetch: main };