const crypto = require("node:crypto");

function createRequestHash(payload) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

module.exports = {
  createRequestHash,
};
