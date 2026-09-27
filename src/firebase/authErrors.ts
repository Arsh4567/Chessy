/**
 * Translates Firebase Auth error codes into clear, user-friendly messages.
 */

export function getFriendlyAuthErrorMessage(error: unknown): string {
  if (!error) return 'An unknown error occurred. Please try again.';

  const errString = error instanceof Error ? error.message : String(error);
  const codeMatch = errString.match(/\(auth\/([a-zA-Z0-9_-]+)\)/) || errString.match(/auth\/([a-zA-Z0-9_-]+)/);
  const code = codeMatch ? codeMatch[1] : '';

  switch (code) {
    case 'invalid-email':
      return 'Please enter a valid email address.';
    case 'user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'user-not-found':
      return 'No account found with this email address. Please sign up first.';
    case 'wrong-password':
    case 'invalid-credential':
    case 'invalid-login-credentials':
      return 'Incorrect email or password. Please verify and try again.';
    case 'email-already-in-use':
      return 'An account with this email address already exists. Please log in instead.';
    case 'weak-password':
      return 'Password is too weak. Please use at least 6 characters with letters and numbers.';
    case 'operation-not-allowed':
      return 'This sign-in method is currently disabled.';
    case 'popup-closed-by-user':
      return 'Google sign-in was cancelled.';
    case 'popup-blocked':
      return 'The sign-in popup was blocked by your browser. Please allow popups for this site.';
    case 'cancelled-popup-request':
      return 'Only one popup request is allowed at a time.';
    case 'network-request-failed':
      return 'Network connection issue. Please check your internet connection and try again.';
    case 'too-many-requests':
      return 'Too many unsuccessful attempts. Access temporarily disabled. Please reset your password or try again later.';
    case 'requires-recent-login':
      return 'Please log in again to complete this sensitive action.';
    case 'credential-already-in-use':
      return 'This account credential is already linked to another user.';
    case 'provider-already-linked':
      return 'This provider is already linked to your account.';
    case 'account-exists-with-different-credential':
      return 'An account already exists with the same email address using a different sign-in method. Please sign in with that method.';
    default:
      if (errString.includes('network') || errString.includes('offline')) {
        return 'Network error. Please check your internet connection.';
      }
      return error instanceof Error ? error.message : 'Authentication failed. Please try again.';
  }
}
