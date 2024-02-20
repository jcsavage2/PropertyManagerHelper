import React from 'react';

const DrawerSkeleton = () => {
  return (
    <div className="flex flex-col gap-4 w-full py-6">
      <div className="skeleton w-24 h-24 mx-auto"></div>
      <div className="skeleton h-4 w-full"></div>
      <div className="skeleton h-12 w-5/6 mx-auto"></div>
      <div className="skeleton h-4 w-full mb-4"></div>
      <div className="skeleton h-8 w-full"></div>
      <div className="skeleton h-8 w-full"></div>
      <div className="skeleton h-8 w-full"></div>
      <div className="skeleton h-8 w-full"></div>
      <div className="skeleton h-8 w-full"></div>
    </div>
  );
};

export default DrawerSkeleton;
