# cdn-cloudflare-workers
Simple CDN-like service for image storage, binded with KV and R2 services from Cloudflare. It's an easy to setup, API-based solution to fetch and upload pictures (GET & PUT) which is basically free if you stay within a generous free tier of 100,000 requests per day and don't exceed 10GB of R2 storage. Comes with auth via api token, rate limiting, image transformations and basic caching capabilities. 

Inspired by [this article](https://transloadit.com/devtips/creating-a-free-image-cdn-with-cloudflare-r2/).

## Prerequisites
Before you bring this bad boy up and running, you need to go through these points:

🟠 Have a Cloudflare account

🟠 Create a KV namespace

🟠 Create a R2 storage bucket (it will prompt for billing details but you won't be charged for anything under 10GB)

🟠 If you are willing to use auth, generate a token with something like `openssl rand -hex 16`

Fill out the placeholders in `wrangler.jsonc` file:
```json
{
"..."
	"r2_buckets": [
		{
			"binding": "BUCKET",
			"bucket_name": "<YOUR_BUCKET_NAME>"
		}
	],
	"kv_namespaces": [
		{
			"binding": "KV",
			"id": "<ID>"
		}
	],
	"vars": {
		"API_TOKEN": "<token>",
		"REQUIRE_AUTH_GET": "<true|false>",
		"REQUIRE_AUTH_PUT": "<true|false>"
	},
"..."
}
```

## Deployment
If you have set up your Cloudflare resourcers and `wrangler.jsonc` file, run the following:
```
npm ci
npm run deploy
```
You will be prompted to log into Cloudflare - after that, the code will be deployed and you will be supplied with URL to it, something like:
```
https://cdn-cloudflare-workers.<account-name>.workers.dev
```

If you'd like to learn more about Cloudflare Workers and other products, go ahead and visit [their docs](https://developers.cloudflare.com/).

## Detailed overwiew
Cloudflare offers a ton of services - this project utilizes 3 of them.

🟠 Cloudlfare Workers - Serverless environment to run the code

🟠 R2 Storage - Object storage, S3 equivalent

🟠 KV - Key-value data storage

They are connected via **Bindings**, making them accessible in the code in a variable-like fashion.

#### Rate limiter
It's a simple, naive implementation that takes IP address from the incoming request, uses it as key in KV and counts the requests. The counter resets every 60s. Right now the limit is 500, I plan to make it a parameter in the near future.

#### Auth
Aside from `API_TOKEN`, there are two sepearate environment variables: `REQUIRE_AUTH_GET` and `REQUIRE_AUTH_PUT`. This allows to control which method needs authorization.

Imagine a scenario, where you would like to use the pictures on a website:
```html
<img src="https://<workers-url>/file.png" alt="Something">
```
For this use case it makes sense to leave the GET request without any auth, but the upload likely shouldn't be for everyone. 

To achieve that, you could set variables as follows:
```
REQUIRE_AUTH_GET=false
REQUIRE_AUTH_PUT=true
```
So that only PUT request will require the token.

#### Image transformations
It's possible to pass below parameters to perform some basic image transformations:

🟠 `w` - image width, ex. 600, 1200 [px]

🟠 `h` - image height, ex. 600, 1200 [px]

🟠 `q` - image quality, ex. 50, 85 [%]

🟠 `f` - image format, ex. png, webp, jpg, json

```
# Convert to WebP
https://<workers-url>/image.jpg?f=webp

# Resize to 800px width and convert to avif
https://<workers-url>/image.jpg?w=800&f=avif

# Get image metadata
https://<workers-url>/image.jpg?f=json
```

#### Cache
Images are cached at two levels:

🟠 Browser Cache: Using Cache-Control: public, max-age=31536000 (1 year)

🟠 Cloudflare's Edge Cache: Automatically caches assets at Cloudflare's edge locations.


## Example usage (without auth)
```
# Upload
curl -X PUT "https://<workers-url>/upload?filename=file.png"
	-H "Content-Type: image/png"
	--data-binary "@file.png"

# Fetch
curl -X GET "https://<workers-url>/file.png"
	--output path/to/output.png
```

## Example usage (with auth)
```
# Upload
curl -X PUT "https://<workers-url>/upload?filename=file.png"
	-H "Content-Type: image/png"
	-H "Authorization: Bearer YOUR_API_TOKEN" \
	--data-binary "@file.png"

# Fetch
curl -X GET ""https://<workers-url>/file.png"
	-H "Authorization: Bearer YOUR_API_TOKEN" \
	--output path/to/output.png
```

## Cloudflare dashboard
You don't have to use requests via `curl` or in any programming language of your choice to manage the pictures. You can always use the UI available in your Cloudflare account and add/delete pictures there, via R2 dashboard.

____

