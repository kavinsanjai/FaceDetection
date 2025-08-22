const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors()); // Important for cross-origin requests
app.use(bodyParser.json({ limit: "50mb" }));

const screenshotDir = path.join(__dirname, "screenshots");
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir);
}

app.post("/upload", (req, res) => {
  const { image, timestamp } = req.body;

  if (!image || !timestamp) {
    return res.status(400).send("Missing image or timestamp");
  }

  const base64Data = image.replace(/^data:image\/png;base64,/, "");
  const filename = `screenshot-${timestamp.replace(/[:.]/g, "-")}.png`;
  const filepath = path.join(screenshotDir, filename);

  fs.writeFile(filepath, base64Data, "base64", (err) => {
    if (err) {
      console.error("❌ Failed to save image:", err);
      return res.status(500).send("Failed to save image");
    }
    console.log("✅ Image saved successfully as:", filename);
    res.send("Image uploaded successfully");
  });
});

// Add this decibel POST endpoint:
app.post("/audio-rms", (req, res) => {
  const { rms, timestamp } = req.body;
  if (typeof rms !== "number" || !timestamp) {
    return res.status(400).send("Missing or invalid RMS or timestamp");
  }
  console.log(`📢 RMS Audio Level at ${timestamp}: ${rms.toFixed(4)}`);
  res.send("RMS data received");
});

//login form
app.post('/login', (req, res) => {
    console.log("hi")
    const {empid, password } = req.body;
    console.log(empid,password);
    const user_id=empid;
    const actionName="Login"
    // const actionDescription=""

    // Find user by email
    excelModel.findOne({ usr_empId: user_id })
        .then(user => {
            if (user) {
                if (user.password === password && user.usr_category !="1") {
                    res.json({
                        status: "success",
                        email: user.usr_email,
                        username: user.usr_name,
                        phoneno: user.usr_mobile,
                    });
                    spawn('node', ['./Logging.js', user_id, actionName, "Success"], { stdio: 'inherit' });
                } else {
                    res.json({ status: "error", message: "Incorrect password" });
                    spawn('node', ['./Logging.js', user_id, actionName, "IncorrectPassword"], { stdio: 'inherit' });
                }
            } else {
                res.json({ status: "error", message: "No user found with this email" });
                spawn('node', ['./Logging.js', user_id, actionName, "Email not found"], { stdio: 'inherit' });
            }
        })
        .catch(err => {
            console.error("Error during login:", err);
            res.status(500).json({ status: "error", message: "Server error", error: err.message });
            spawn('node', ['./Logging.js', user_id, actionName, "ServerError"], { stdio: 'inherit' });
        });
});


// Catch-all to print every request to terminal
app.use((req, res, next) => {
  next();
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
