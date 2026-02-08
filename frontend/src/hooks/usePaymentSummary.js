import { useState, useEffect } from 'react';
import { BACKEND_URL } from '../utils/apiConfig';

const API = BACKEND_URL;

export const usePaymentSummary = (bookingId) => {
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!bookingId) return;

    const fetchPaymentData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `${API}/api/payments/bookings/${bookingId}/payment-history`,
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : '',
            },
            credentials: 'include',
          }
        );

        if (!response.ok) throw new Error('Failed to fetch payment data');

        const data = await response.json();
        
        console.log("💰 Payment History Response:", data);
        
        setPaymentData(data);
        setError(null);
      } catch (err) {
        console.error('❌ Error fetching payment data:', err);
        setError(err.message);
        setPaymentData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentData();
  }, [bookingId]);

  // ✅ CORRECT CALCULATION - Use booking data as source of truth
  const booking = paymentData?.booking || {};
  const bills = paymentData?.bills || [];
  
  // Use booking's actual amounts (already calculated by backend)
  const totalAmount = Number(booking.totalAmount || 0);
  const paidAmount = Number(booking.paidAmount || 0);
  const balanceAmount = Number(booking.balanceAmount || 0);
  const discount = Number(booking.discount || 0);
  
  // Calculate from bills only as backup
  const totalPaidFromBills = bills.reduce(
    (sum, bill) => sum + Number(bill.amountPaid || 0),
    0
  );
  
  // Determine if there's pending payment
  const hasPendingBill = balanceAmount > 0;
  const isFullyPaid = balanceAmount === 0 && totalAmount > 0;
  
  console.log("💳 Payment Summary Calculated:", {
    bookingId,
    totalAmount,
    paidAmount,
    balanceAmount,
    discount,
    totalPaidFromBills,
    hasPendingBill,
    isFullyPaid,
    billCount: bills.length
  });

  return {
    bills,
    booking,
    loading,
    error,
    // ✅ Return booking's actual values
    totalAmount,
    totalPaid: paidAmount, // Use booking.paidAmount, not sum of bills
    currentBalance: balanceAmount, // Use booking.balanceAmount
    discount,
    hasPendingBill,
    isFullyPaid,
  };
};