// Shared auto-logout hook for admin pages
import { useEffect, useRef } from 'react';

export default function useAutoLogout({ enabled, decodeToken, onLogout, idleTimeoutMs }) {
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    if (!enabled) return;

    let expiryTimerId = null;
    let idleTimerId = null;
    let activityCheckInterval = null;

    const scheduleExpiryLogout = () => {
      try {
        const token = localStorage.getItem('token');
        const decoded = token ? decodeToken(token) : null;
        if (decoded?.exp) {
          const msUntilExpiry = decoded.exp * 1000 - Date.now();
          const hoursUntilExpiry = msUntilExpiry / (1000 * 60 * 60);
          
          console.log(`Token expires in ${hoursUntilExpiry.toFixed(2)} hours`);
          
          if (msUntilExpiry <= 0) {
            console.log('Token has already expired, logging out immediately');
            onLogout();
          } else {
            console.log(`Scheduling logout in ${msUntilExpiry}ms (${hoursUntilExpiry.toFixed(2)} hours)`);
            expiryTimerId = setTimeout(() => {
              console.log('Token expired, logging out');
              onLogout();
            }, msUntilExpiry);
          }
        }
      } catch (err) {
        console.error('Error decoding token:', err);
        // ignore decode errors and do not schedule
      }
    };

    const checkIdleStatus = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;
      
      if (timeSinceLastActivity >= idleTimeoutMs) {
        onLogout();
      }
    };

    const activityHandler = () => {
      lastActivityRef.current = Date.now();
    };

    // Schedule token expiry logout
    scheduleExpiryLogout();
    
    // Start checking for idle status every 30 seconds
    activityCheckInterval = setInterval(checkIdleStatus, 30000);

    // Listen for user activity
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'keyup', 'mousedown'];
    events.forEach(evt => window.addEventListener(evt, activityHandler, { passive: true }));

    return () => {
      if (expiryTimerId) clearTimeout(expiryTimerId);
      if (idleTimerId) clearTimeout(idleTimerId);
      if (activityCheckInterval) clearInterval(activityCheckInterval);
      events.forEach(evt => window.removeEventListener(evt, activityHandler));
    };
  }, [enabled, decodeToken, onLogout, idleTimeoutMs]);
}


