import React from 'react';

type LoadMoreProps = {
  isDisabled: boolean;
  isVisible: boolean;
  onClick: () => void;
};

const LoadMore = ({ isDisabled, isVisible, onClick }: LoadMoreProps) => {
  if (!isVisible) return null;
  return (
    <button
      disabled={isDisabled}
      className='btn w-32 btn-secondary'
      onClick={() => {
        if (isDisabled) return;
        onClick();
      }}
    >
      Load More
    </button>
  );
};

export default LoadMore;
