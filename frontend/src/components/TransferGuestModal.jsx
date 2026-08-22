import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowRightLeft, Building2, Clock, DoorOpen, X } from "lucide-react";
import { motion } from "framer-motion";
import { useDashboardRefresh } from "../context/DashboardRefreshContext";
import { BACKEND_URL } from "../utils/apiConfig";

const API = BACKEND_URL || "";
const INDIA_TIME_ZONE = "Asia/Kolkata";

const indiaParts = (value = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
};

const combineIndiaDateTime = (date, time) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || !/^\d{2}:\d{2}$/.test(time || "")) return null;
  const parsed = new Date(`${date}T${time}:00+05:30`);
  if (Number.isNaN(parsed.getTime()) || indiaParts(parsed).date !== date) return null;
  return parsed;
};

const currentSegmentStart = (booking) => {
  const history = Array.isArray(booking?.transferHistory) ? booking.transferHistory : [];
  const latest = history[history.length - 1]?.segmentTo;
  if (latest) return new Date(latest);
  return combineIndiaDateTime(indiaParts(booking?.from).date, booking?.checkInTime || "00:00");
};

const finalCheckout = (booking) =>
  combineIndiaDateTime(indiaParts(booking?.to).date, booking?.checkOutTime || "23:59");

const overlaps = (startA, endA, startB, endB) => startA < endB && endA > startB;

const formatDateTime = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: INDIA_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);

export default function TransferGuestModal({ booking, onClose, onSuccess, theme = "light" }) {
  const { refreshDashboard } = useDashboardRefresh();
  const nowParts = indiaParts();
  const [step, setStep] = useState(1);
  const [hostels, setHostels] = useState([]);
  const [bookingsByRoom, setBookingsByRoom] = useState(new Map());
  const [toHostel, setToHostel] = useState("");
  const [toRoomNo, setToRoomNo] = useState("");
  const [transferDate, setTransferDate] = useState(nowParts.date);
  const [transferTime, setTransferTime] = useState(nowParts.time);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const bookingId = booking?._id || booking?.id;
  const segmentStart = currentSegmentStart(booking);
  const checkout = finalCheckout(booking);

  useEffect(() => {
    let cancelled = false;
    const loadOptions = async () => {
      try {
        setLoading(true);
        setError("");
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [hostelResponse, bookingResponse] = await Promise.all([
          fetch(`${API}/api/hostels/all`, { credentials: "include", headers }),
          fetch(`${API}/api/bookings/all`, { credentials: "include", headers }),
        ]);
        const [hostelData, bookingData] = await Promise.all([hostelResponse.json(), bookingResponse.json()]);
        if (!hostelResponse.ok || !hostelData.success) throw new Error(hostelData.message || "Failed to load hostels");
        if (!bookingResponse.ok || !bookingData.success) throw new Error(bookingData.message || "Failed to load room availability");

        const roomMap = new Map();
        (bookingData.hostels || []).forEach((hostel) => {
          (hostel.rooms || []).forEach((room) => {
            roomMap.set(`${hostel.name}::${room.roomNo}`, room.bookings || []);
          });
        });

        if (!cancelled) {
          setHostels((hostelData.hostels || []).filter((hostel) => hostel.active !== false));
          setBookingsByRoom(roomMap);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || "Failed to load transfer options");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadOptions();
    return () => { cancelled = true; };
  }, []);

  const transferAt = combineIndiaDateTime(transferDate, transferTime);

  const validationError = useMemo(() => {
    if (!transferAt || !segmentStart || !checkout) return "Enter a valid transfer date and time.";
    if (transferAt > new Date()) return "Transfer date and time cannot be in the future.";
    if (transferAt < segmentStart) return "Transfer cannot be before the current room segment started.";
    if (transferAt >= checkout) return "Transfer must be before the final checkout date and time.";
    if (toHostel === booking?.hostel && toRoomNo === booking?.roomNo) return "Select a different hostel or room.";
    return "";
  }, [booking?.hostel, booking?.roomNo, checkout, segmentStart, toHostel, toRoomNo, transferAt]);

  const availableRooms = useMemo(() => {
    const hostel = hostels.find((item) => item.name === toHostel);
    if (!hostel || !transferAt || !checkout) return [];

    return (hostel.rooms || []).filter((room) => {
      if (room.guestRoom === false || room.isBlocked || room.roomState === "maintenance_blocked" || room.roomState === "cleaning_pending") {
        return false;
      }
      if (hostel.name === booking?.hostel && String(room.roomNo) === String(booking?.roomNo)) return false;

      const roomBookings = bookingsByRoom.get(`${hostel.name}::${room.roomNo}`) || [];
      return !roomBookings.some((candidate) => {
        const candidateId = candidate?._id || candidate?.id;
        if (String(candidateId) === String(bookingId)) return false;
        if (!["booked", "checked_in"].includes(candidate?.status)) return false;
        const candidateStart = currentSegmentStart(candidate);
        const candidateEnd = finalCheckout(candidate);
        return candidateStart && candidateEnd && overlaps(transferAt, checkout, candidateStart, candidateEnd);
      });
    });
  }, [booking?.hostel, booking?.roomNo, bookingId, bookingsByRoom, checkout, hostels, toHostel, transferAt]);

  const selectedRoomAvailable = availableRooms.some((room) => String(room.roomNo) === String(toRoomNo));

  const submitTransfer = async () => {
    try {
      setError("");
      if (validationError) throw new Error(validationError);
      if (!toHostel || !toRoomNo) throw new Error("Select a destination hostel and room.");
      if (!selectedRoomAvailable) throw new Error("The selected destination room is no longer available for the remaining stay.");

      setSubmitting(true);
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(`${API}/api/bookings/${bookingId}/transfer`, {
        method: "PUT",
        credentials: "include",
        headers,
        body: JSON.stringify({ toHostel, toRoomNo, transferDate, transferTime, remarks }),
      });
      const data = await response.json();
      if (!response.ok || !data.success || !data.booking) {
        throw new Error(data.message || "Failed to transfer guest");
      }

      refreshDashboard(true);
      onSuccess?.(data.booking, data.message);
    } catch (submitError) {
      setError(submitError.message || "Failed to transfer guest");
    } finally {
      setSubmitting(false);
    }
  };

  const panelClass = theme === "dark" ? "bg-gray-800 text-gray-100" : "bg-white text-gray-900";
  const fieldClass = `w-full rounded-lg border px-3 py-2 text-sm ${theme === "dark" ? "border-gray-600 bg-gray-700" : "border-gray-300 bg-white"}`;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 px-4" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className={`max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl shadow-2xl ${panelClass}`}>
        <div className="flex items-start justify-between border-b px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold"><ArrowRightLeft className="h-5 w-5 text-blue-600" /> Transfer Guest</h2>
            <p className="mt-1 text-sm text-gray-500">Step {step} of 3 · {booking?.guest}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100/10"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {loading && <p className="text-sm text-gray-500">Loading enabled guest rooms…</p>}

          {!loading && step === 1 && (
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold"><Building2 className="h-4 w-4" /> Destination Hostel</label>
              <select value={toHostel} onChange={(event) => { setToHostel(event.target.value); setToRoomNo(""); setError(""); }} className={fieldClass}>
                <option value="">Select enabled hostel</option>
                {hostels.map((hostel) => <option key={hostel._id || hostel.name} value={hostel.name}>{hostel.name}</option>)}
              </select>
            </div>
          )}

          {!loading && step === 2 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-semibold"><DoorOpen className="h-4 w-4" /> Available Guest Rooms</label>
                <span className="text-xs text-gray-500">{toHostel}</span>
              </div>
              {availableRooms.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">No enabled, unblocked room is available for the remaining stay.</div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {availableRooms.map((room) => (
                    <button key={room._id || room.roomNo} type="button" onClick={() => { setToRoomNo(String(room.roomNo)); setError(""); }} className={`rounded-xl border p-3 text-left transition ${String(toRoomNo) === String(room.roomNo) ? "border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-100" : theme === "dark" ? "border-gray-600 hover:border-blue-500" : "border-gray-200 hover:border-blue-400"}`}>
                      <span className="block font-semibold">Room {room.roomNo}</span>
                      <span className="text-xs opacity-70">{room.roomType || "Guest Room"}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && step === 3 && (
            <div className="space-y-5">
              <div className={`rounded-xl border p-4 text-sm ${theme === "dark" ? "border-gray-700 bg-gray-900" : "border-blue-100 bg-blue-50"}`}>
                <p className="font-semibold">{booking?.guest}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span>{booking?.hostel} · Room {booking?.roomNo}</span><ArrowRight className="h-4 w-4 text-blue-600" /><span>{toHostel} · Room {toRoomNo}</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="mb-1 block text-sm font-semibold">Transfer Date</label><input type="date" min={indiaParts(segmentStart).date} max={nowParts.date} value={transferDate} onChange={(event) => setTransferDate(event.target.value)} className={fieldClass} /></div>
                <div><label className="mb-1 block text-sm font-semibold">Transfer Time</label><input type="time" value={transferTime} onChange={(event) => setTransferTime(event.target.value)} className={fieldClass} /></div>
              </div>

              <div className={`rounded-lg px-3 py-2 text-sm ${theme === "dark" ? "bg-gray-700" : "bg-gray-50"}`}>
                <p className="flex items-center gap-2"><Clock className="h-4 w-4" /><span className="font-medium">Final checkout:</span> {formatDateTime(checkout)}</p>
                <p className="mt-1 text-xs text-amber-700">Destination status will be Booked / Awaiting Report In. The destination caretaker must use the existing Report In action.</p>
              </div>

              <div><label className="mb-1 block text-sm font-semibold">Remarks (optional)</label><textarea rows={3} value={remarks} onChange={(event) => setRemarks(event.target.value)} className={fieldClass} placeholder="Reason for transfer" /></div>

              {validationError && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{validationError}</div>}
              {!validationError && !selectedRoomAvailable && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">The selected room is unavailable at this transfer time. Go back and choose another room.</div>}
            </div>
          )}

          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        </div>

        <div className="flex items-center justify-between border-t px-6 py-4">
          <button type="button" onClick={() => step === 1 ? onClose?.() : setStep((value) => value - 1)} className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"><ArrowLeft className="h-4 w-4" /> {step === 1 ? "Cancel" : "Back"}</button>
          {step < 3 ? (
            <button type="button" disabled={loading || (step === 1 ? !toHostel : !toRoomNo)} onClick={() => setStep((value) => value + 1)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400">Next <ArrowRight className="h-4 w-4" /></button>
          ) : (
            <button type="button" disabled={submitting || Boolean(validationError) || !selectedRoomAvailable} onClick={submitTransfer} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400">{submitting ? "Transferring…" : "Confirm Transfer"}</button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
