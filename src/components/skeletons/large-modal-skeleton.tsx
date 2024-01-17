import React from 'react';

const LargeModalSkeleton = () => {
  return (
    <div className="flex flex-col gap-4 w-full p-10">
      <div className="skeleton h-16 w-full"></div>
      <div className="flex flex-row gap-4 w-2/3 pb-4">
        <div className="skeleton h-24 w-1/2"></div>
        <div className="skeleton h-24 w-1/2"></div>
      </div>
      <div className="skeleton h-32 w-full"></div>

      <div className="skeleton h-4 w-36"></div>
      <div className="skeleton h-4 w-full"></div>
      <div className="skeleton h-4 w-full"></div>
      <div className="skeleton h-4 w-full"></div>
      <div className="skeleton h-4 w-full"></div>
      <div className="skeleton h-16 w-full"></div>
      <div className="skeleton h-16 w-full"></div>
    </div>
  );
};

export default LargeModalSkeleton;
