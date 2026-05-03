import React from 'react';

type StatusType = 'DRAFT' | 'PENDING' | 'ADMIN_REVIEW' | 'ADMIN_APPROVED' | 'ADMIN_REJECTED' | 'TL_REVIEW' | 'TL_APPROVAL' | 'TL_APPROVED' | 'TL_ADJUSTED' | 'TL_REJECTED' | 'FINANCE_BATCH' | 'APPROVED' | 'FINALIZED' | 'PAID' | 'REJECTED';

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  let bgColor = 'bg-gray-100';
  let textColor = 'text-gray-800';
  let dotColor = 'bg-gray-500';
  let displayLabel = status.replace(/_/g, ' ');

  switch (status) {
    case 'ADMIN_APPROVED':
    case 'TL_APPROVED':
    case 'APPROVED':
    case 'FINALIZED':
    case 'PAID':
      bgColor = 'bg-green-50';
      textColor = 'text-green-700';
      dotColor = 'bg-green-500';
      break;
    case 'ADMIN_REJECTED':
    case 'TL_REJECTED':
    case 'REJECTED':
      bgColor = 'bg-red-50';
      textColor = 'text-red-700';
      dotColor = 'bg-red-500';
      break;
    case 'PENDING':
    case 'ADMIN_REVIEW':
    case 'TL_REVIEW':
    case 'TL_APPROVAL':
    case 'FINANCE_BATCH':
      bgColor = 'bg-yellow-50';
      textColor = 'text-yellow-700';
      dotColor = 'bg-yellow-500';
      break;
    case 'TL_ADJUSTED':
      bgColor = 'bg-blue-50';
      textColor = 'text-blue-700';
      dotColor = 'bg-blue-500';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor} border border-opacity-20 border-current ${className}`}>
      <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${dotColor}`}></span>
      {displayLabel}
    </span>
  );
};
