import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function RouteEffects() {
  const location = useLocation();
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    setShowProgress(true);
    const timer = window.setTimeout(() => setShowProgress(false), 540);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.search]);

  return showProgress ? <div aria-hidden="true" className="route-progress" /> : null;
}
