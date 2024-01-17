import React from 'react';

type MobileCardProps = {
  title?: string;
  children: React.ReactNode;
  padding?: string;
  marginBottom?: string;
  shadow?: string;
};

const MobileCard = ({ title, children, padding, marginBottom, shadow }: MobileCardProps) => {
  return (
    <div
      className={`${padding ?? 'p-4'} ${
        marginBottom ?? 'mb-4'
      } ${shadow ?? 'shadow-lg'} bg-neutral-content text-primary-content border border-neutral border-opacity-10 rounded w-full  last-of-type:mb-0 `}
    >
      {title ? <p className="text-lg mb-1.5">{title}</p> : null}
      {children}
    </div>
  );
};

export default MobileCard;
