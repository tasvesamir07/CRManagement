import { useEffect } from 'react';

export default function useRefetchOnFocus(refetch) {
  useEffect(() => {
    const handleFocus = () => refetch();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetch]);
}
