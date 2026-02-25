export const getCertificateStatus = (expiryDate) => {
  if (!expiryDate) return 'No Expiry';
  const now = new Date();
  const expiry = new Date(expiryDate);
  const days = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'Expired';
  if (days <= 30) return 'Expiring Soon';
  return 'Active';
};

export const isAllowedFile = (file) => {
  if (!file) return true;
  const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
  const maxSize = 5 * 1024 * 1024;
  return allowed.includes(file.type) && file.size <= maxSize;
};

export const formatDate = (dateValue) => {
  if (!dateValue) return '—';
  const date = typeof dateValue?.toDate === 'function' ? dateValue.toDate() : new Date(dateValue);
  return date.toLocaleDateString();
};
