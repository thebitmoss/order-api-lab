function logInfo(payload) {
  console.log(
    JSON.stringify({
      level: "info",
      timestamp: new Date().toISOString(),
      ...payload,
    }),
  );
}

module.exports = {
  logInfo,
};
