import { useUserContext } from "@/context/user";
import { toTitleCase } from "@/utils";
import axios from "axios";
import { AiOutlineFilter } from "react-icons/ai";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import Link from "next/link";
import { IProperty } from "@/database/entities/property";
import { PartialProperty, SortConfig } from "@/hooks/use-sortable-data";
import { LoadingSpinner } from "./loading-spinner/loading-spinner";


export const PropertiesTable = ({ items, isLoading, sortConfig, requestSort, filteredData }:
  {
    items: PartialProperty[];
    isLoading: boolean;
    filteredData: PartialProperty[];
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
    <table className={`w-full border-spacing-x-10 table-auto`}>
      <thead>
        <tr className="text-left text-gray-400">
          {Object.keys(items?.[0])?.map((key) => (
            <th key={key} className={`font-normal px-4 cursor-pointer`} onClick={() => requestSort(key as keyof PartialProperty)}>
              {key === "postalCode" ? "Zip" : toTitleCase(key)}
              {sortConfig && sortConfig.key === key && (sortConfig.direction === 'ascending' ? ' 🔽' : ' 🔼')}
            </th>
          ))}
        </tr>

      </thead>
      <tbody>
        {filteredData.map((item, idx) => (
          <tr key={idx}>
            {Object.values(item).map((val, idx) => (
              <td key={idx} className="border px-4 py-1">{val}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

