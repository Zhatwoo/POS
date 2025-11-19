// Timestamp utility functions for consistent date/time handling
// Handles Firestore Timestamp objects, ISO strings, and Date objects

/**
 * Convert various timestamp formats to JavaScript Date object
 * @param {any} timestamp - Firestore Timestamp, ISO string, Date object, or null
 * @returns {Date|null} - JavaScript Date object or null
 */
export const toDate = (timestamp) => {
  if (!timestamp) return null;
  
  // If it's already a Date object
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  // If it's a Firestore Timestamp (has toDate method)
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  // If it's an ISO string or number
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    const date = new Date(timestamp);
    // Check if date is valid
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // If it's an object with seconds/nanoseconds (Firestore Timestamp structure)
  if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
    return new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
  }
  
  return null;
};

/**
 * Format date to locale string with consistent format
 * @param {any} timestamp - Firestore Timestamp, ISO string, Date object, or null
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} - Formatted date string or 'N/A'
 */
export const formatDate = (timestamp, options = {}) => {
  const date = toDate(timestamp);
  if (!date) return 'N/A';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };
  
  return date.toLocaleDateString('en-US', defaultOptions);
};

/**
 * Format date and time to locale string
 * @param {any} timestamp - Firestore Timestamp, ISO string, Date object, or null
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} - Formatted date/time string or 'N/A'
 */
export const formatDateTime = (timestamp, options = {}) => {
  const date = toDate(timestamp);
  if (!date) return 'N/A';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };
  
  return date.toLocaleString('en-US', defaultOptions);
};

/**
 * Format time only
 * @param {any} timestamp - Firestore Timestamp, ISO string, Date object, or null
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} - Formatted time string or 'N/A'
 */
export const formatTime = (timestamp, options = {}) => {
  const date = toDate(timestamp);
  if (!date) return 'N/A';
  
  const defaultOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...options,
  };
  
  return date.toLocaleTimeString('en-US', defaultOptions);
};

/**
 * Get relative time (e.g., "2 days ago", "in 3 hours")
 * @param {any} timestamp - Firestore Timestamp, ISO string, Date object, or null
 * @returns {string} - Relative time string or 'N/A'
 */
export const getRelativeTime = (timestamp) => {
  const date = toDate(timestamp);
  if (!date) return 'N/A';
  
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) {
    return diffSec < 0 ? 'in a moment' : 'just now';
  } else if (diffMin < 60) {
    return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
  } else if (diffHour < 24) {
    return diffHour === 1 ? '1 hour ago' : `${diffHour} hours ago`;
  } else if (diffDay < 7) {
    return diffDay === 1 ? '1 day ago' : `${diffDay} days ago`;
  } else {
    return formatDate(date);
  }
};

/**
 * Check if timestamp is within date range
 * @param {any} timestamp - Firestore Timestamp, ISO string, Date object, or null
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {boolean} - True if timestamp is within range
 */
export const isWithinDateRange = (timestamp, startDate, endDate) => {
  const date = toDate(timestamp);
  if (!date) return false;
  
  return date >= startDate && date <= endDate;
};

/**
 * Get ISO string from timestamp
 * @param {any} timestamp - Firestore Timestamp, ISO string, Date object, or null
 * @returns {string|null} - ISO string or null
 */
export const toISOString = (timestamp) => {
  const date = toDate(timestamp);
  if (!date) return null;
  
  return date.toISOString();
};

/**
 * Get days until expiry
 * @param {any} timestamp - Firestore Timestamp, ISO string, Date object, or null
 * @returns {number|null} - Days until expiry (negative if expired) or null
 */
export const getDaysUntilExpiry = (timestamp) => {
  const date = toDate(timestamp);
  if (!date) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryDate = new Date(date);
  expiryDate.setHours(0, 0, 0, 0);
  
  const diffTime = expiryDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

