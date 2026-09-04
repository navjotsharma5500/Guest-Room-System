const normalizeAddress = (address = "") => {
  const value = String(address).trim();
  return value.startsWith("::ffff:") ? value.slice(7) : value;
};

const configuredProxyAddresses = String(process.env.TRUSTED_PROXY_IPS || "")
  .split(",")
  .map(normalizeAddress)
  .filter(Boolean);

const trustedProxyAddresses = new Set([
  "127.0.0.1",
  "::1",
  ...configuredProxyAddresses,
]);

// Nginx is the sole HTTP hop in the EC2 deployment. Trust forwarded addresses
// only when the socket peer itself is that local/configured proxy, and never
// trust a second hop from a client-supplied X-Forwarded-For chain.
export const trustImmediateProxy = (address, hop) =>
  hop === 0 && trustedProxyAddresses.has(normalizeAddress(address));

