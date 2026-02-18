import { getStore } from "@netlify/blobs";

export const handler = async (event) => {
    // Hidden link/token check could be added here if desired for more security, 
    // but the URL itself is the "hidden" part as requested.

    try {
        const store = getStore("analytics");
        const stats = await store.get("stats", { type: "json" }) || { totalVisits: 0, uniqueVisitors: 0 };

        // Option to list recent visitors (fingerprints)
        // Note: Blobs list operation might be limited, but for a small site it's fine.
        const visitorsList = await store.list({ prefix: "visitor:" });

        const detailedVisitors = [];
        for (const item of visitorsList.blobs) {
            const data = await store.get(item.key, { type: "json" });
            detailedVisitors.push({
                fingerprint: item.key.replace("visitor:", ""),
                ...data
            });
        }

        // Sort by last visit descending
        detailedVisitors.sort((a, b) => new Date(b.lastVisit) - new Date(a.lastVisit));

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                // Allow CORs if needed, though same domain is better
            },
            body: JSON.stringify({
                stats,
                visitors: detailedVisitors
            })
        };
    } catch (error) {
        console.error("Get stats error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to fetch stats" })
        };
    }
};
