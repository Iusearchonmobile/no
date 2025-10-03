// File: index.js (in Replit)

// Import the required libraries
const { parseBuffer } = require('rbx-reader-rts');
const axios = require('axios');
const express = require('express');

// Initialize the Express web server
const app = express();
const PORT = 3000; // Replit automatically handles the port

// Define our main API endpoint
app.get('/get-source', async (req, res) => {
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
            res.set('Content-Type', 'text/plain');
            res.send(mainAncestor.Source);
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
});

// Start the server and listen for requests
app.listen(PORT, () => {
    console.log(`Server is running and listening on port ${PORT}`);
});
