export const shouldRetry = (error: any, statusCode?: number): boolean => {
  if (statusCode === 401 || statusCode === 403) {
    return false;
  }
  if (statusCode && statusCode >= 400 && statusCode < 500) {
    return statusCode === 429;
  }
  if (statusCode && statusCode >= 500) {
    return true;
  }
  if (error?.code === "TIMEOUT" || error?.code === "NETWORK_ERROR") {
    return true;
  }
  if (
    error?.message?.toLowerCase().includes("network") ||
    error?.name === "TypeError"
  ) {
    return true;
  }
  return false;
};

export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
