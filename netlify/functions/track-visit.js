import { getStore } from "./lib/blobs.js";

export const handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { fingerprint, data: fingerprintDetails } = JSON.parse(event.body);
        if (!fingerprint) {
            return { statusCode: 400, body: "Fingerprint missing" };
        }

        const store = getStore("analytics");
        const now = new Date().toISOString();

        // Get current stats
        let stats = await store.get("stats", { type: "json" }) || { totalVisits: 0, uniqueVisitors: 0 };

        // Check visitor data
        const visitorData = await store.get(`visitor:${fingerprint}`, { type: "json" });

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

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                local: process.env.NETLIFY_DEV === "true"
            })
        };
    } catch (error) {
        console.error("Tracking error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
