import { toTitleCase } from "@/utils";
import Link from "next/link";
import { PartialProperty, SortConfig } from "@/hooks/use-sortable-data";
import { LoadingSpinner } from "./loading-spinner/loading-spinner";


export const PropertiesCards = ({ items, isLoading, sortConfig, requestSort, filteredData }:
  {
    items: PartialProperty[];
    filteredData: PartialProperty[];
    isLoading: boolean;
    sortConfig: SortConfig | null;
    requestSort: (key: "address" | "city" | "state" | "postalCode" | "unit") => void;
  }) => {
  if (isLoading) {
    return (<LoadingSpinner />);
  }
  if (!items.length) {
    return null;
  }
  return (
    <div className={`w-full border-spacing-x-10 table-auto`}>

    </div>
  );
};

