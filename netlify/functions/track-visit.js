import { getStore } from "@netlify/blobs";
import fs from "fs/promises";
import path from "path";

// Simple local store fallback for development
const LOCAL_STORE_PATH = path.join(process.cwd(), ".netlify-mock-blobs.json");

async function getLocalData() {
    try {
        const data = await fs.readFile(LOCAL_STORE_PATH, "utf8");
        return JSON.parse(data);
    } catch (e) {
        return { stats: { totalVisits: 0, uniqueVisitors: 0 }, visitors: {} };
    }
}

async function saveLocalData(data) {
    await fs.writeFile(LOCAL_STORE_PATH, JSON.stringify(data, null, 2));
}

export const handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { fingerprint, data: fingerprintDetails } = JSON.parse(event.body);
        if (!fingerprint) {
            return { statusCode: 400, body: "Fingerprint missing" };
        }

        const isLocal = process.env.NETLIFY_DEV === "true" || !process.env.SITE_ID;

        if (isLocal) {
            const data = await getLocalData();
            const now = new Date().toISOString();

            if (!data.visitors[fingerprint]) {
                data.stats.uniqueVisitors++;
                data.visitors[fingerprint] = {
                    firstVisit: now,
                    lastVisit: now,
                    visitCount: 1,
                    details: fingerprintDetails
                };
            } else {
                data.visitors[fingerprint].lastVisit = now;
                data.visitors[fingerprint].visitCount++;
                data.visitors[fingerprint].details = fingerprintDetails;
            }

            data.stats.totalVisits++;
            await saveLocalData(data);

            return { statusCode: 200, body: JSON.stringify({ success: true, local: true }) };
        }

        // Netlify Blobs Production Logic
        const store = getStore("analytics");
        let stats = await store.get("stats", { type: "json" }) || { totalVisits: 0, uniqueVisitors: 0 };
        const visitorData = await store.get(`visitor:${fingerprint}`, { type: "json" });
        const now = new Date().toISOString();

        if (!visitorData) {
            stats.uniqueVisitors++;
            await store.setJSON(`visitor:${fingerprint}`, {
                firstVisit: now,
                lastVisit: now,
                visitCount: 1,
                details: fingerprintDetails
            });
        } else {
            visitorData.lastVisit = now;
            visitorData.visitCount++;
            visitorData.details = fingerprintDetails;
            await store.setJSON(`visitor:${fingerprint}`, visitorData);
        }

        stats.totalVisits++;
        await store.setJSON("stats", stats);

        return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } catch (error) {
        console.error("Tracking error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
