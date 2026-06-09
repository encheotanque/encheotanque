import React from 'react';
import { useOutletContext } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user } = useOutletContext<{ user: any }>() || {};
  const companyIdQuery = user?.companyId ? `?companyId=${user.companyId}` : '';

  return (
    <div 
      className="w-full" 
      style={{ 
        width: '100%', 
        height: '100%', 
        minHeight: 'calc(100vh - 7rem)', 
        backgroundColor: '#f8fafc',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid #e2e8f0'
      }}
    >
      <iframe
        src={`/backoffice_dashboard.html${companyIdQuery}`}
        style={{ 
          width: '100%', 
          height: 'calc(100vh - 7.2rem)', 
          border: 'none', 
          display: 'block',
          backgroundColor: '#f8fafc'
        }}
        title="Enche o Tanque - Dashboard Corporativo"
      />
    </div>
  );
};
