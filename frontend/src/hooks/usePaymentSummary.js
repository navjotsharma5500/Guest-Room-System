import { useState, useEffect } from 'react';
import { BACKEND_URL } from '../utils/apiConfig';

const API = BACKEND_URL;

export const usePaymentSummary = (bookingId) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!bookingId) return;

    const fetchBills = async () => {
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

        if (!response.ok) throw new Error('Failed to fetch bills');

        const data = await response.json();
        setBills(data.bills || []);
        setError(null);
      } catch (err) {
        console.error('❌ Error fetching bills:', err);
        setError(err.message);
        setBills([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBills();
  }, [bookingId]);

  // ✅ Single source of truth
  const hasPendingBill = bills.some(
    (bill) => Number(bill.balanceAfterPayment || 0) > 0
  );

  const totalPaid = bills.reduce(
    (sum, bill) => sum + Number(bill.amountPaid || 0),
    0
  );

  const currentBalance = bills.length > 0
    ? Number(bills[bills.length - 1].balanceAfterPayment || 0)
    : 0;

  const totalAmount = bills.reduce(
    (sum, bill) => sum + Number(bill.totalAmount || 0),
    0
  );

  return {
    bills,
    loading,
    error,
    hasPendingBill,
    totalPaid,
    currentBalance,
    totalAmount,
    isFullyPaid: !hasPendingBill && totalAmount > 0,
  };
};