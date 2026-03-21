import React, { createContext, useContext, useCallback, useRef } from 'react';
import { useToast } from "./ToastContext";

/**
 * 🔄 CENTRALIZED DASHBOARD REFRESH SYSTEM
 * 
 * This context provides a single refresh function that all modals can call.
 * It integrates with Socket.IO and prevents multiple simultaneous refreshes.
 * 
 * Usage in modals:
 * const { refreshDashboard } = useDashboardRefresh();
 * 
 * Then call refreshDashboard() in onSuccess handlers:
 * onSuccess={() => {
 *   refreshDashboard();
 *   showToast("✅ Action completed!");
 * }}
 */

const DashboardRefreshContext = createContext(null);

export function useDashboardRefresh() {
  const context = useContext(DashboardRefreshContext);
  if (!context) {
    throw new Error('useDashboardRefresh must be used within DashboardRefreshProvider');
  }
  return context;
}

export function DashboardRefreshProvider({ children, onRefresh }) {
  const isRefreshing = useRef(false);
  const refreshQueue = useRef([]);

  /**
   * 🔥 MAIN REFRESH FUNCTION
   * - Prevents duplicate refreshes
   * - Queues multiple rapid requests
   * - Ensures socket sync before refresh
   */
  const refreshDashboard = useCallback((silent = false) => {
    console.log('🎯 refreshDashboard called - silent:', silent, 'isRefreshing:', isRefreshing.current);

    // If already refreshing, queue this request
    if (isRefreshing.current) {
      console.log('⏳ Refresh in progress, queueing...');
      refreshQueue.current.push({ silent });
      return;
    }

    isRefreshing.current = true;

    // Small delay to allow Socket.IO to emit events first
    setTimeout(() => {
      console.log('🔄 Executing refresh...');
      
      if (typeof onRefresh === 'function') {
        onRefresh(silent);
      }

      // Process queue after refresh completes
      setTimeout(() => {
        isRefreshing.current = false;
        
        if (refreshQueue.current.length > 0) {
          console.log(`📋 Processing ${refreshQueue.current.length} queued refresh(es)`);
          const nextRefresh = refreshQueue.current.shift();
          refreshQueue.current = []; // Clear queue to avoid duplicates
          refreshDashboard(nextRefresh.silent);
        }
      }, 500); // Wait 500ms before processing queue
    }, 100); // Initial 100ms delay for Socket.IO
  }, [onRefresh]);

  const value = {
    refreshDashboard,
  };

  return (
    <DashboardRefreshContext.Provider value={value}>
      {children}
    </DashboardRefreshContext.Provider>
  );
}

/**
 * 📋 INTEGRATION GUIDE
 * 
 * 1️⃣ In GuestRoomDashboard.jsx:
 * 
 * import { DashboardRefreshProvider } from './context/DashboardRefreshContext';
 * 
 * // Inside component:
 * const handleRefresh = useCallback((silent = false) => {
 *   console.log('🔄 Dashboard refresh triggered - silent:', silent);
 *   refresh(); // Call your existing refresh from useHostelDataPolling
 * }, [refresh]);
 * 
 * // Wrap your component:
 * return (
 *   <DashboardRefreshProvider onRefresh={handleRefresh}>
 *     <ToastProvider theme={theme}>
 *       {/* Your existing dashboard content *\/}
 *     </ToastProvider>
 *   </DashboardRefreshProvider>
 * );
 * 
 * 
 * 2️⃣ In ALL Modals (ReportedModal, PaymentModal, CancelModal, ExtensionModal):
 * 
 * import { useDashboardRefresh } from '../context/DashboardRefreshContext';
 * 
 * export default function YourModal({ onSuccess, ...props }) {
 *   const { refreshDashboard } = useDashboardRefresh();
 * 
 *   const handleSuccess = async (data) => {
 *     // Your existing success logic...
 *     
 *     // ✅ CRITICAL: Call refresh AFTER success
 *     setTimeout(() => {
 *       refreshDashboard(true); // silent = true for background refresh
 *       
 *       // Then call parent's onSuccess
 *       if (onSuccess) {
 *         onSuccess(data);
 *       }
 *     }, 100);
 *   };
 * 
 *   return (
 *     // Your modal JSX
 *   );
 * }
 * 
 * 
 * 3️⃣ Socket.IO Events (Backend):
 * 
 * After EVERY database update:
 * 
 * // After booking creation
 * await booking.save();
 * io.emit('booking-created', { booking });
 * 
 * // After booking extension
 * await booking.save();
 * io.emit('booking-extended', { bookingId: booking._id });
 * 
 * // After booking cancellation
 * await booking.save();
 * io.emit('booking-cancelled', { bookingId: booking._id });
 * 
 * // After payment update
 * await booking.save();
 * io.emit('payment-updated', { bookingId: booking._id });
 * 
 * // After reported status
 * await booking.save();
 * io.emit('guest-reported', { bookingId: booking._id });
 * 
 * 
 * 4️⃣ Socket.IO Listeners (Already in useHostelDataPolling):
 * 
 * ✅ Your existing listeners are CORRECT:
 * socket.on('booking-created', () => fetchData(true));
 * socket.on('booking-extended', () => fetchData(true));
 * socket.on('booking-cancelled', () => fetchData(true));
 * socket.on('payment-updated', () => fetchData(true));
 * socket.on('guest-reported', () => fetchData(true));
 * 
 * 
 * 🎯 BENEFITS:
 * ✅ Single source of truth for refreshes
 * ✅ Prevents duplicate refresh calls
 * ✅ Works with Socket.IO events
 * ✅ Silent background updates
 * ✅ No page reloads needed
 * ✅ Queue system prevents race conditions
 */

// Example Modal Implementation
export function ExampleModalWithRefresh({ booking, onClose, onSuccess }) {
  const { refreshDashboard } = useDashboardRefresh();
  const { showToast } = useToast();
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Your API call
      const response = await fetch(`/api/bookings/${booking._id}/action`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ /* your data */ }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Action failed');
      }

      // ✅ CRITICAL: Refresh dashboard FIRST
      setTimeout(() => {
        refreshDashboard(true); // silent refresh
        
        // Then call parent's onSuccess
        if (onSuccess) {
          onSuccess(result.booking);
        }
        
        // Finally close modal
        onClose();
      }, 100);

    } catch (err) {
      console.error('❌ Action error:', err);
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal">
      <h2>Example Modal</h2>
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Processing...' : 'Submit'}
      </button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
}

export default DashboardRefreshProvider;