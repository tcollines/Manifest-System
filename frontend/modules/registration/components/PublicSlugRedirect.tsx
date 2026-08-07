import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export const PublicSlugRedirect: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const rawPath = (slug || window.location.pathname.replace(/^\//, '')).toLowerCase();

    // Match 12th Anniversary / Private Transport vanity links
    if (rawPath.includes('12th') || rawPath.includes('anniversary') || rawPath.includes('privatetransport')) {
      navigate('/public/registration/9e402abf-53f2-4b99-9432-01bba2086e6e', { replace: true });
      return;
    }

    // Default fallback to public registration for 12th Anniversary event
    navigate('/public/registration/9e402abf-53f2-4b99-9432-01bba2086e6e', { replace: true });
  }, [slug, navigate]);

  return (
    <div className="min-h-screen bg-ministry-black flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ministry-orange"></div>
    </div>
  );
};
