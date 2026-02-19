import { getStore } from "@netlify/blobs";
import fs from "fs/promises";
import path from "path";

const LOCAL_STORE_PATH = path.join(process.cwd(), ".netlify-mock-blobs.json");

async function getLocalData() {
    try {
        const data = await fs.readFile(LOCAL_STORE_PATH, "utf8");
        return JSON.parse(data);
    } catch (e) {
        return { stats: { totalVisits: 0, uniqueVisitors: 0 }, visitors: {} };
    }
}

export const handler = async (event) => {
    try {
        const isLocal = process.env.NETLIFY_DEV === "true" || !process.env.SITE_ID;

        if (isLocal) {
            const data = await getLocalData();
            const detailedVisitors = Object.entries(data.visitors).map(([fp, v]) => ({
                fingerprint: fp,
                ...v
            }));

            detailedVisitors.sort((a, b) => new Date(b.lastVisit) - new Date(a.lastVisit));

            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ stats: data.stats, visitors: detailedVisitors, local: true })
            };
        }

        // Netlify Blobs Production Logic
        const store = getStore("analytics");
        const stats = await store.get("stats", { type: "json" }) || { totalVisits: 0, uniqueVisitors: 0 };
        const visitorsList = await store.list({ prefix: "visitor:" });

        const detailedVisitors = [];
        for (const item of visitorsList.blobs) {
            const data = await store.get(item.key, { type: "json" });
            detailedVisitors.push({
                fingerprint: item.key.replace("visitor:", ""),
                ...data
            });
        }

        detailedVisitors.sort((a, b) => new Date(b.lastVisit) - new Date(a.lastVisit));

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stats, visitors: detailedVisitors })
        };
    } catch (error) {
        console.error("Get stats error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
