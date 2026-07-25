export const computeDocumentStatus = (expiryDate: string | 'N/A'): 'Active' | 'Expired' | 'Renewal Needed' => {
  if (!expiryDate || expiryDate === 'N/A') {
    return 'Active';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  if (expiry < today) {
    return 'Expired';
  }

  // Calculate difference in days
  const diffTime = Math.abs(expiry.getTime() - today.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 90) {
    return 'Renewal Needed';
  }

  return 'Active';
};
