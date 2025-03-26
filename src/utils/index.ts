import { PhotonImage, SamplingFilter, resize } from "@cf-wasm/photon";

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
	const rateLimit = parseInt(env.RATE_LIMIT || '500');

	await env.KV.put(rateLimitKey, (currentRequests + 1).toString(), {
		expirationTtl: 60,
	})

	if (currentRequests > rateLimit) {
		return new Response('Rate limit exceeded', { status: 429 });
	}

	await env.KV.put(rateLimitKey, (currentRequests + 1).toString(), { expirationTtl: 60 });
	return null; // No rate limit exceeded
}

// Image transformations
export async function processImage(
	imageBuffer: ArrayBuffer,
	options: ImageTransformOptions = {}
): Promise<ProcessedImage> {
	const {
		width = null,
		height = null,
		quality = null,
		format = 'auto',
		originalContentType = 'jpeg'
	} = options;

	try {
		// Uint8Array instance
		const imageBytes = new Uint8Array(imageBuffer)

		// Initialize Photon
		let inputImage = PhotonImage.new_from_byteslice(imageBytes)

		// Create working copy to avoid modifying original
		let workingImage = PhotonImage.new_from_byteslice(imageBytes);

		// Resize if dimensions are specified
		if ((width && width > 0) || (height && height > 0)) {
			const resizedImage = resize(
				workingImage,
				width || inputImage.get_width(),
				height || inputImage.get_height(),
				SamplingFilter.Nearest
			);

			// Free previous working image and update
			workingImage.free();
			workingImage = resizedImage;
		}

		// Adjust quality if specified
		if (quality && (quality > 0 && quality < 100)) {
			const qualityRatio = quality / 100
			const scaledImage = resize(
				workingImage,
				Math.floor(workingImage.get_width() * qualityRatio),
				Math.floor(workingImage.get_height() * qualityRatio),
				SamplingFilter.Nearest
			);

			// Free previous working image and update
			workingImage.free();
			workingImage = scaledImage;
		}

		// Determine target format
		const targetFormat = format === 'auto'
			? originalContentType
			: format;

		// Output byte array
		let outputBytes: Uint8Array;

		try {
			switch (targetFormat) {
				case "png":
					outputBytes = workingImage.get_bytes();
					break;
				case "jpeg":
					outputBytes = workingImage.get_bytes_jpeg(1);
					break;
				default:
					outputBytes = workingImage.get_bytes_webp();
			}
		} catch (encodeError) {
			console.error('Encoding error:', encodeError);
			throw encodeError;
		}

		// Free images
		inputImage.free();
		workingImage.free();

		return {
			buffer: outputBytes.buffer,
			contentType: `image/${targetFormat}`
		};
	} catch (error) {
		console.error('Image processing error:', error);
		throw error;
	}
}