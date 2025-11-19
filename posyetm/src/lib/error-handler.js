// Error handling utility functions

/**
 * Get user-friendly error message from Firebase error
 * @param {Error} error - The error object
 * @returns {string} - User-friendly error message
 */
export const getErrorMessage = (error) => {
  if (!error) return 'An unknown error occurred. Please try again.';
  
  // Firebase Auth errors
  if (error.code) {
    switch (error.code) {
      case 'permission-denied':
        return 'You do not have permission to perform this action.';
      case 'unavailable':
        return 'Service is temporarily unavailable. Please check your internet connection.';
      case 'unauthenticated':
        return 'You must be logged in to perform this action.';
      case 'not-found':
        return 'The requested item was not found.';
      case 'already-exists':
        return 'This item already exists.';
      case 'failed-precondition':
        return 'The operation cannot be completed at this time.';
      case 'aborted':
        return 'The operation was cancelled.';
      case 'out-of-range':
        return 'The value is out of range.';
      case 'unimplemented':
        return 'This feature is not yet implemented.';
      case 'internal':
        return 'An internal error occurred. Please try again later.';
      case 'deadline-exceeded':
        return 'The operation took too long. Please try again.';
      case 'cancelled':
        return 'The operation was cancelled.';
      case 'data-loss':
        return 'Data loss occurred. Please refresh and try again.';
      case 'unknown':
        return 'An unknown error occurred. Please try again.';
      default:
        return error.message || 'An error occurred. Please try again.';
    }
  }
  
  // Network errors
  if (error.message) {
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Network error. Please check your internet connection.';
    }
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
  }
  
  // Default message
  return error.message || 'An error occurred. Please try again.';
};

/**
 * Log error for debugging
 * @param {Error} error - The error object
 * @param {string} context - Context where error occurred
 */
export const logError = (error, context = '') => {
  console.error(`[${context}] Error:`, error);
  // In production, you might want to send this to an error tracking service
};

/**
 * Show error to user (can be extended to use toast notifications)
 * @param {string} message - Error message to show
 */
export const showError = (message) => {
  // For now, use alert. Can be replaced with toast notifications
  alert(message);
};

/**
 * Handle error with logging and user notification
 * @param {Error} error - The error object
 * @param {string} context - Context where error occurred
 * @param {boolean} showToUser - Whether to show error to user
 */
export const handleError = (error, context = '', showToUser = true) => {
  logError(error, context);
  if (showToUser) {
    const message = getErrorMessage(error);
    showError(message);
  }
  return getErrorMessage(error);
};

