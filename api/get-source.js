// File: api/get-source.js

const { parseBuffer } = require('rbx-reader-rts');
const axios = require('axios');

// Vercel Serverless Functions export a handler function.
// The 'req' and 'res' objects are the same as in Express.
module.exports = async (req, res) => {
    // Get parameters from the URL query string (e.g., ?assetId=...&rbxapikey=...)
    const { assetId, rbxapikey } = req.query;

    // --- 1. Validate Input ---
    if (!assetId) {
        return res.status(400).send("Error: 'assetId' parameter is required.");
    }
    if (!rbxapikey) {
        return res.status(400).send("Error: 'rbxapikey' parameter is required.");
    }

    try {
        // --- 2. Download the Asset ---
        const locationUrl = `https://apis.roblox.com/asset-delivery-api/v1/assetId/${assetId}`;
        const headers = { "x-api-key": rbxapikey, "Accept": "application/json" };

        console.log(`Requesting asset location for: ${assetId}`);
        const locationResponse = await axios.get(locationUrl, { headers });
        const assetDownloadUrl = locationResponse.data.location;
        if (!assetDownloadUrl) throw new Error("Could not find 'location' in API response.");

        console.log("Downloading asset content...");
        const assetResponse = await axios.get(assetDownloadUrl, { responseType: 'arraybuffer' });
        const modelContent = Buffer.from(assetResponse.data);
        console.log("Asset content downloaded successfully.");

        // --- 3. Parse the Model and Find the Main Ancestor's Source ---
        console.log("Parsing asset...");
        const root = await parseBuffer(modelContent);
        const mainAncestor = root.instances.find(inst => inst.parent === root.dataModel);

        if (mainAncestor && mainAncestor.Source) {
            console.log("Source code found. Sending response.");
            res.setHeader('Content-Type', 'text/plain');
            res.status(200).send(mainAncestor.Source);
        } else if (mainAncestor) {
            res.status(404).send("Error: The main ancestor was found, but it does not have a 'Source' property.");
        } else {
            res.status(404).send("Error: No top-level ancestor was found in the model.");
        }

    } catch (error) {
        console.error("An error occurred:", error.message);
        if (error.response) {
            res.status(error.response.status).send(`Roblox API Error: ${error.response.data}`);
        } else {
            res.status(500).send(`Server Error: ${error.message}`);
        }
    }
};
