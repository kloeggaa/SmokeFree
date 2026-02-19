import { getStore as getNetlifyStore, connectLambda } from "@netlify/blobs";
import fs from "fs/promises";
import path from "path";

const MOCK_STORE_PATH = path.join(process.cwd(), ".netlify-mock-blobs.json");

async function getMockData() {
    try {
        const data = await fs.readFile(MOCK_STORE_PATH, "utf8");
        return JSON.parse(data);
    } catch (e) {
        return {};
    }
}

async function saveMockData(data) {
    await fs.writeFile(MOCK_STORE_PATH, JSON.stringify(data, null, 2));
}

class MockStore {
    constructor(name) {
        this.name = name;
    }

    async get(key, options = {}) {
        const data = await getMockData();
        const value = data[`${this.name}:${key}`];
        if (value === undefined) return null;
        if (options.type === "json") return value;
        return value;
    }

    async setJSON(key, value) {
        const data = await getMockData();
        data[`${this.name}:${key}`] = value;
        await saveMockData(data);
    }

    async list(options = {}) {
        const data = await getMockData();
        const prefix = options.prefix || "";
        const blobs = Object.keys(data)
            .filter(fullKey => fullKey.startsWith(`${this.name}:${prefix}`))
            .map(fullKey => ({
                key: fullKey.replace(`${this.name}:`, "")
            }));
        return { blobs };
    }
}

export function getStore(name, event) {
    // For V1 functions (Lambda compatibility mode), we must manually connect the environment
    // using the event object.
    if (event) {
        try {
            connectLambda(event);
        } catch (e) {
            // Ignore if connectLambda fails (e.g. if event doesn't have blobs data)
        }
    }

    try {
        // Try to get the real store
        return getNetlifyStore(name);
    } catch (e) {
        if (e.name === "MissingBlobsEnvironmentError" || e.message.includes("configured to use Netlify Blobs")) {
            console.log(`[Blobs Shim] Using local fallback for store: ${name}`);
            return new MockStore(name);
        }
        throw e;
    }
}
