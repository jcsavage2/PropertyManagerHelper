import React from 'react';

const PropertyPageSkeleton = () => {
  return (
    <div className="flex flex-col gap-4 py-2 px-4">
      <div className="w-full h-4 flex flex-row justify-between">
        <div className="skeleton h-4 w-1/4 mx-auto"></div>
        <div className="skeleton h-4 w-1/4 mx-auto"></div>
        <div className="skeleton h-4 w-1/4 mx-auto"></div>
      </div>
      <div className="skeleton h-1 w-full mb-2"></div>
      <div className="w-2/3 mx-auto flex flex-col gap-6">
        <div className="skeleton h-12"></div>
        <div className="skeleton h-12"></div>
        <div className="skeleton h-12"></div>
        <div className="skeleton h-12"></div>
        <div className="skeleton h-12"></div>
        <div className="flex flex-row w-2/3 gap-4 justify-center mx-auto">
          <div className="skeleton h-12 w-44"></div>
          <div className="skeleton h-12 w-20"></div>
        </div>
      </div>
    </div>
  );
};

export default PropertyPageSkeleton;
