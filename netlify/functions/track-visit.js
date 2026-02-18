import { getStore } from "@netlify/blobs";

export const handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { fingerprint } = JSON.parse(event.body);
        if (!fingerprint) {
            return { statusCode: 400, body: "Fingerprint missing" };
        }

        const store = getStore("analytics");

        // Get current stats
        let stats = await store.get("stats", { type: "json" }) || { totalVisits: 0, uniqueVisitors: 0 };

        // Check if this fingerprint exists
        const visitorData = await store.get(`visitor:${fingerprint}`, { type: "json" });

        const now = new Date().toISOString();

        if (!visitorData) {
            // New unique visitor
            stats.uniqueVisitors++;
            await store.setJSON(`visitor:${fingerprint}`, {
                firstVisit: now,
                lastVisit: now,
                visitCount: 1
            });
        } else {
            // Returning visitor
            visitorData.lastVisit = now;
            visitorData.visitCount++;
            await store.setJSON(`visitor:${fingerprint}`, visitorData);
        }

        stats.totalVisits++;
        await store.setJSON("stats", stats);

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true })
        };
    } catch (error) {
        console.error("Tracking error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to track visit" })
        };
    }
};
