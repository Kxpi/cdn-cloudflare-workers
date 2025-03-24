declare global {
    interface Env {
        API_TOKEN: string;
        // auth on GET requests
        REQUIRE_AUTH_GET: string;
        // auth on POST requests
        REQUIRE_AUTH_PUT: string;
        KV: KVNamespace;
        BUCKET: R2Bucket;
    }
}

export { };