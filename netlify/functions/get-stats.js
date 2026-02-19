import { getStore } from "./lib/blobs.js";

export const handler = async (event) => {
    try {
        const store = getStore("analytics", event);
        const stats = await store.get("stats", { type: "json" }) || { totalVisits: 0, uniqueVisitors: 0 };

        // List all visitors
        const visitorsList = await store.list({ prefix: "visitor:" });

        const detailedVisitors = [];
        for (const item of visitorsList.blobs) {
            const data = await store.get(item.key, { type: "json" });
            if (data) {
                detailedVisitors.push({
                    fingerprint: item.key.replace("visitor:", ""),
                    ...data
                });
            }
        }

        // Sort by last visit descending
        detailedVisitors.sort((a, b) => new Date(b.lastVisit) - new Date(a.lastVisit));

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                stats,
                visitors: detailedVisitors,
                local: process.env.NETLIFY_DEV === "true"
            })
        };
    } catch (error) {
        console.error("Get stats error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
