require("dotenv/config");

const app = require("./app");

const port = process.env.PORT || 3000;
const host = process.env.HOST || "127.0.0.1";

app.listen(port, host, () => {
  console.log(`API server is running on http://${host}:${port}`);
});
