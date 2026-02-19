# Netlify Blobs Learnings & Troubleshooting

## Core Issue: Netlify Blobs in V1 Functions
When using the "V1" Handler syntax for Netlify Functions (the common `export const handler = async (event) => { ... }` pattern), Netlify Blobs does **not** automatically inject the environment variables (`NETLIFY_BLOBS_CONTEXT`) into the function execution context.

### The Symptom
The function falls back to a local mock store (if implemented as a shim) or throws a `MissingBlobsEnvironmentError`. In production, this often results in a read-only filesystem error (`EROFS`) because the mock store tries to write a JSON file to the function's deployment package.

### The Resolution: `connectLambda`
To fix this without migrating to V2 functions, you must manually initialize the environment by calling `connectLambda(event)` from the `@netlify/blobs` package.

```javascript
import { getStore, connectLambda } from "@netlify/blobs";

export const handler = async (event) => {
    // CRITICAL: Initialize blobs environment for V1 handlers
    connectLambda(event);

    const store = getStore("my-store");
    // ... use store
};
```

## Implementation Best Practice (Helper Utility)
If you use a common helper to manage blobs (providing local fallbacks for development), ensure it can accept the `event` object.

```javascript
// lib/blobs.js
import { getStore as getNetlifyStore, connectLambda } from "@netlify/blobs";

export function getStore(name, event) {
    if (event) {
        try {
            connectLambda(event);
        } catch (e) {
            // Log or ignore failure
        }
    }
    return getNetlifyStore(name);
}
```

## Key Documentation Links
- [Netlify Blobs Documentation](https://docs.netlify.com/products/blobs/get-started/)
- [Lambda Compatibility Mode (V1 Handlers)](https://docs.netlify.com/functions/lambda-compatibility/)
