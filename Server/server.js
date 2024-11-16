const express = require("express");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = 5000;

// Initialize Firebase Admin SDK
const serviceAccount = require("./sec-management-firebase-admins.json"); // Replace with your Firebase service account file

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://sec-management-default-rtdb.asia-southeast1.firebasedatabase.app" // Replace with your Firebase Realtime Database URL
});

// Define a reference to the Firebase database
const db = admin.database();

// Define usersRef to reference the "users" node in Firebase
const usersRef = db.ref("users"); // This reference needs to be accessible to all routes

// Middleware to parse JSON
app.use(bodyParser.json());

// Add CORS middleware to allow cross-origin requests
app.use(cors({
    origin: "http://localhost:3001" // Allow requests only from your frontend running on this URL
}));

// Admin login (existing functionality)
app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            console.log("Username or password missing");
            return res.status(400).send({ error: "Username and password are required" });
        }

        console.log(`Attempting login for user: ${username}`);

        const snapshot = await db.ref("admins").child(username).once("value");
        const adminData = snapshot.val();

        if (!adminData) {
            console.log(`No data found for username: ${username}`);
        } else {
            console.log(`Admin data found for username: ${username}`, adminData);
        }

        if (!adminData || adminData.password !== password) {
            console.log(`Invalid login attempt for username: ${username}`);
            return res.status(401).send({ error: "Invalid username or password." });
        }

        console.log(`Login successful for user: ${username}`);
        res.status(200).send({ message: "Login successful.", username });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).send({ error: "Failed to log in." });
    }
});

// Endpoint to get user data by ID
app.get("/get-user", async (req, res) => {
    try {
        const { id } = req.query;

        if (!id) {
            console.error("ID is required but missing");
            return res.status(400).send({ error: "ID is required" });
        }

        console.log(`Attempting to retrieve user with ID: ${id}`);

        // Retrieve the entire "users" collection from Firebase
        const snapshot = await usersRef.once("value");

        if (!snapshot.exists()) {
            console.error("The users node does not exist in Firebase.");
            return res.status(404).send({ error: "No users found in the database" });
        }

        const usersData = snapshot.val();

        if (!usersData) {
            console.error("Users data is empty after retrieving from Firebase.");
            return res.status(404).send({ error: "No users found in the database" });
        }

        // Iterate over each user in the collection and find the user with the given "id"
        let matchedUser = null;
        for (let key in usersData) {
            if (usersData[key].id === id) {
                matchedUser = usersData[key];
                break;
            }
        }

        if (!matchedUser) {
            console.log(`No data found for ID: ${id}`);
            return res.status(404).send({ error: "User not found" });
        }

        console.log(`User data found for ID: ${id}`, matchedUser);

        // Send the matched user data back to the client
        res.status(200).send(matchedUser);
    } catch (error) {
        console.error("Error retrieving user:", error);
        res.status(500).send({ error: "Failed to retrieve user data." });
    }
});
// Endpoint to update the "scanned" status to true
app.post("/admit-user", async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            console.error("ID is required but missing");
            return res.status(400).send({ error: "ID is required" });
        }

        console.log(`Attempting to admit user with ID: ${id}`);

        // Retrieve the entire "users" collection from Firebase
        const snapshot = await usersRef.once("value");
        const usersData = snapshot.val();

        if (!usersData) {
            console.error("Users data is empty after retrieving from Firebase.");
            return res.status(404).send({ error: "No users found in the database" });
        }

        let userKey = null;
        for (let key in usersData) {
            if (usersData[key].id === id) {
                userKey = key;
                break;
            }
        }

        if (!userKey) {
            console.log(`No data found for ID: ${id}`);
            return res.status(404).send({ error: "User not found" });
        }

        // Update the scanned status to true
        await usersRef.child(userKey).update({ scanned: true });
        console.log(`User with ID: ${id} has been admitted (scanned: true)`);

        res.status(200).send({ message: "User admitted successfully." });
    } catch (error) {
        console.error("Error admitting user:", error);
        res.status(500).send({ error: "Failed to admit user." });
    }
});
// Start the Express server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
