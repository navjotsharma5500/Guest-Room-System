import http from "node:http";
import https from "node:https";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import fetch from "node-fetch";
import PublicForm from "../models/PublicForm.js";
import { isPublicFormUrl } from "../models/PublicForm.js";
import { validFormId } from "../controllers/publicFormController.js";

// Resolve IPv4 only and reject non-public ranges, including metadata/link-local
// addresses. The checked address is returned directly to the connecting socket.
export function isPublicIPv4(address) {
  if (isIP(address) !== 4) return false;
  const [a, b, c] = address.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99)))
    || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100)))
    || (a === 203 && b === 0 && c === 113));
}

export function safeLookup(resolve = lookup) {
  return (hostname, options, callback) => {
    resolve(hostname, { family: 4, all: true }).then((addresses) => {
      if (!addresses.length || addresses.some(({ address }) => !isPublicIPv4(address))) {
        callback(new Error("File host did not resolve to a public IPv4 address."));
        return;
      }
      const address = { address: addresses[0].address, family: 4 };
      if (options?.all) callback(null, [address]);
      else callback(null, address.address, address.family);
    }, callback);
  };
}

export function allowedDownloadUrl(value, allowedHosts) {
  if (!isPublicFormUrl(value)) return false;
  const url = new URL(value);
  const hosts = allowedHosts.split(",").map((host) => host.trim().toLowerCase()).filter(Boolean);
  return hosts.includes(url.hostname.toLowerCase()) && !isIP(url.hostname.replace(/^\[|\]$/g, ""))
    && !url.port && !url.hash;
}

export function createPublicFormDownload({
  fetchFile = fetch,
  resolve = lookup,
  timeoutMs = 15000,
  maxBytes = 20 * 1024 * 1024,
  allowedHosts = () => process.env.PUBLIC_FORM_ALLOWED_HOSTS || "ik.imagekit.io",
} = {}) {
  return async (req, res) => {
    if (Object.keys(req.query).length) return res.status(400).json({ success: false, message: "Download query parameters are not supported." });
    if (!validFormId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid form ID." });
    let agent;
    let timer;
    const abort = new AbortController();
    const cancel = () => abort.abort();
    try {
      const form = await PublicForm.findOne({ _id: req.params.id, enabled: true }).lean();
      if (!form) return res.status(404).json({ success: false, message: "Public form not found." });
      if (!allowedDownloadUrl(form.fileUrl, allowedHosts())) {
        return res.status(422).json({ success: false, message: "This file host or URL is not supported for downloads." });
      }
      const Agent = new URL(form.fileUrl).protocol === "https:" ? https.Agent : http.Agent;
      agent = new Agent({ lookup: safeLookup(resolve), keepAlive: false });
      timer = setTimeout(cancel, timeoutMs);
      res.once("close", cancel);
      // No redirects, credentials, caller-supplied headers, or arbitrary URLs.
      const upstream = await fetchFile(form.fileUrl, { agent, signal: abort.signal, redirect: "manual", compress: false });
      if (upstream.status !== 200 || !upstream.body
        || Number(upstream.headers.get("content-length")) > maxBytes
        || ![null, "identity"].includes(upstream.headers.get("content-encoding"))) {
        upstream.body?.destroy();
        throw new Error("Unsupported or oversized upstream response.");
      }
      const fallback = `${form.slug}.${form.fileType.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin"}`;
      const filename = (form.originalFileName || fallback).replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 240);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      const contentType = upstream.headers.get("content-type");
      res.setHeader("Content-Type", contentType && /^[\w.+-]+\/[\w.+-]+(?:;[^\r\n]*)?$/.test(contentType) ? contentType : "application/octet-stream");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "no-store");
      let received = 0;
      const limit = new Transform({ transform(chunk, encoding, callback) {
        received += chunk.length;
        callback(received > maxBytes ? new Error("File exceeds download size limit.") : null, chunk);
      } });
      await pipeline(upstream.body, limit, res, { signal: abort.signal });
    } catch (error) {
      if (!res.headersSent && !res.destroyed) {
        res.removeHeader("Content-Disposition");
        res.status(abort.signal.aborted ? 504 : 502).json({ success: false, message: "Unable to download this file." });
      } else if (!res.destroyed) res.destroy();
    } finally {
      clearTimeout(timer);
      res.removeListener("close", cancel);
      agent?.destroy();
    }
  };
}

export const downloadPublicForm = createPublicFormDownload();
