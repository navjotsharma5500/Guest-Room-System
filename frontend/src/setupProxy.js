const { createProxyMiddleware } = require("http-proxy-middleware");

const target = process.env.REACT_APP_API_PROXY || "http://localhost:10000";

module.exports = function setupProxy(app) {
  app.use(
    ["/api", "/socket.io"],
    createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
      logLevel: "warn",
    })
  );
};
