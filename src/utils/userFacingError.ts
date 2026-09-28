const messageFrom = (error: unknown) => error instanceof Error ? error.message.trim() : '';

export function userFacingError(error: unknown, fallback: string) {
  const message = messageFrom(error);
  if (!message) return fallback;

  if (/failed to fetch|networkerror|network request failed|load failed/i.test(message)) {
    return 'FocusOS could not reach the service. Check your internet connection and try again.';
  }
  if (/timeout|timed out|aborterror/i.test(message)) {
    return 'The service took too long to respond. Please try again.';
  }
  if (/jwt|access token|refresh token|not authenticated|session/i.test(message)) {
    return 'Your session needs refreshing. Sign in again, then retry.';
  }
  if (/row-level security|permission denied|not authorised|unauthorized|forbidden/i.test(message)) {
    return 'FocusOS does not have permission to complete that action. Refresh the page and try again.';
  }
  if (/duplicate key|unique constraint|already exists/i.test(message)) {
    return 'That item already exists. Refresh the page before trying again.';
  }
  if (/relation .* does not exist|column .* does not exist|pgrst|postgres|supabase/i.test(message)) {
    return fallback;
  }

  return message.length <= 180 ? message : fallback;
}
