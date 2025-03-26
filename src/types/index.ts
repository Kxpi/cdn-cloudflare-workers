declare global {
    interface Env {
        API_TOKEN: string;
        // auth on GET requests
        REQUIRE_AUTH_GET: string;
        // auth on PUT requests
        REQUIRE_AUTH_PUT: string;
        CACHE_BROWSER_SECONDS: string;
        RATE_LIMIT: string;
        KV: KVNamespace;
        BUCKET: R2Bucket;
    }

    interface ImageTransformOptions {
        width?: number | null;
        height?: number | null;
        quality?: number | null;
        format?: string;
        originalContentType?: string;
    }

    interface ProcessedImage {
        buffer: ArrayBuffer;
        contentType: string;
    }
}

export { };
