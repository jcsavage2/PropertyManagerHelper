import { Dispatch, SetStateAction } from 'react';
import { MdClear } from 'react-icons/md';

export const SearchBar = ({
  searchString,
  setSearchString,
  resultsLoading,
  onSearch,
  onClear,
  placeholder,
}: {
  searchString: string;
  setSearchString: Dispatch<SetStateAction<string>>;
  resultsLoading: boolean;
  onSearch: () => void;
  onClear: () => void;
  placeholder?: string;
}) => {
  return (
    <div className={`flex flex-row items-center justify-start h-10 mt-4 mb-2 ${resultsLoading && 'opacity-50 pointer-events-none'}`}>
      <input
        type="text"
        placeholder={placeholder ?? 'Search...'}
        className="pl-3 h-full pr-9 w-80 input input-bordered bg-white"
        value={searchString}
        onChange={(e) => {
          setSearchString(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSearch();
          }
        }}
      />
      <MdClear
        fontSize={24}
        className={`cursor-pointer text-error hover:text-red-600 relative -left-7 ${!searchString && 'opacity-0 pointer-events-none'}}`}
        onClick={() => {
          onClear();
        }}
      />
      <div
        className="relative -left-3 px-3 py-1 btn btn-sm btn-secondary"
        onClick={() => {
          onSearch();
        }}
      >
        Search
      </div>
    </div>
  );
};
