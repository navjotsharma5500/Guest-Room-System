import React, { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import Barcode from "react-barcode";
import { Download, Printer } from "lucide-react";

export default function SupportQRCodeManager({ showToast = () => {} }) {
  const [rooms, setRooms] = useState([]);
  const [selectedUrl, setSelectedUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const qrRef = useRef(null);

  const normalizeSupportUrl = (url = "") => {
    if (!url) return "";
    try {
      const parsed = new URL(url, window.location.origin);
      if (["10000", "10001"].includes(parsed.port)) {
        parsed.port = window.location.port || "3000";
      }
      return parsed.toString();
    } catch {
      return url;
    }
  };

  useEffect(() => {
    const loadRooms = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/guest-support/qr-rooms", { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load QR rooms");
        const normalizedRooms = (data.rooms || []).map((room) => ({
          ...room,
          supportUrl: normalizeSupportUrl(room.supportUrl),
        }));
        setRooms(normalizedRooms);
        setSelectedUrl(normalizedRooms?.[0]?.supportUrl || "");
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        setLoading(false);
      }
    };
    loadRooms();
  }, [showToast]);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.supportUrl === selectedUrl),
    [rooms, selectedUrl]
  );

  const downloadQr = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${selectedRoom?.hostelName || "guest-support"}-${selectedRoom?.roomNo || "room"}-qr.png`.replace(/\s+/g, "-");
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const printQr = () => {
    if (!selectedRoom) return;
    const printWindow = window.open("", "_blank", "width=720,height=900");
    if (!printWindow) return;
    const canvas = qrRef.current?.querySelector("canvas");
    const image = canvas?.toDataURL("image/png");
    printWindow.document.write(`
      <html>
        <head><title>Guest Support QR</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 40px;">
          <h1>TIET Guest Support</h1>
          <h2>${selectedRoom.hostelName} - ${selectedRoom.roomNo}</h2>
          <img src="${image}" style="width: 260px; height: 260px;" />
          <p style="font-size: 13px; word-break: break-all;">${selectedRoom.supportUrl}</p>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-slate-50 p-4">
        <label className="block text-sm font-bold text-slate-700 mb-2">Select Room</label>
        <select
          value={selectedUrl}
          onChange={(event) => setSelectedUrl(event.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        >
          {rooms.map((room) => (
            <option key={`${room.hostelId}-${room.roomId}`} value={room.supportUrl}>
              {room.hostelName} - {room.roomNo} {room.roomType ? `(${room.roomType})` : ""}
            </option>
          ))}
        </select>
        {loading && <p className="mt-2 text-sm text-slate-500">Loading rooms...</p>}
      </div>

      {selectedRoom && (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
          <div className="rounded-2xl border p-5 text-center bg-white" ref={qrRef}>
            <QRCodeCanvas value={selectedRoom.supportUrl} size={220} includeMargin />
            <p className="mt-3 font-black text-slate-900">{selectedRoom.roomNo}</p>
            <p className="text-sm text-slate-500">{selectedRoom.hostelName}</p>
          </div>

          <div className="rounded-2xl border p-5 bg-white space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-black">Support URL</p>
              <p className="mt-1 text-sm break-all text-blue-700">{selectedRoom.supportUrl}</p>
            </div>
            <div className="overflow-hidden">
              <Barcode value={selectedRoom.supportUrl} height={58} width={1.1} fontSize={10} />
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={downloadQr} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 font-bold">
                <Download className="w-4 h-4" />
                Download QR
              </button>
              <button onClick={printQr} className="inline-flex items-center gap-2 rounded-lg bg-red-600 text-white px-4 py-2 font-bold">
                <Printer className="w-4 h-4" />
                Print QR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
