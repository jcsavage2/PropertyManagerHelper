import { toTitleCase } from "@/utils";
import { useEffect, useState } from "react";
import { ITechnician } from "@/database/entities/technician";
import { v4 as uuid } from "uuid";

export type TechnicianTableProps = {
  technicians: ITechnician[];
};

export const TechnicianTable = (props: TechnicianTableProps) => {
  const [technicians, setTechnicians] = useState<Array<ITechnician>>([]);

  useEffect(() => {
    setTechnicians(props.technicians);
  }, [props]);

  const columns: { label: string, accessor: keyof ITechnician; width: string; }[] = [
    { label: "Name", accessor: "technicianName", width: "w-56" },
    { label: "Email", accessor: "technicianEmail", width: "" },
    { label: "Joined", accessor: "created", width: "" },
  ];

  const formattedTechnicians: Partial<ITechnician>[] = technicians.map(tech => {
    const { technicianName, technicianEmail, created } = tech;
    const date = new Date(created ?? "");
    const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    return {
      pk: tech.pk,
      sk: tech.sk,
      technicianName: toTitleCase(technicianName),
      technicianEmail,
      created: formattedDate,
      organization: tech?.organization,
    };
  });

  return (
    <div className="mt-8 mb-4">
      <div className="overflow-x-auto">
        <table className='w-full mt-4 border-spacing-x-10 table-auto'>
          <thead className=''>
            <tr className='text-left text-gray-400'>
              {columns.map(({ label, accessor, width }) => {
                return (
                  <th
                    className={`font-normal px-4 cursor-pointer ${width}`}
                    key={accessor}
                  >
                    {label}
                  </th>);
              })}
            </tr>
          </thead>
          <tbody className='text-gray-700'>

            {formattedTechnicians.map((technician) => {
              return (
                <tr key={uuid()}>
                  {columns.map(({ label, accessor, width }) => {
                    const columnData = technician[accessor];
                    return <td className="border px-4 py-1" key={accessor}>{columnData}</td>;
                  })}
                </tr>);
            })}
          </tbody>
        </table>
      </div >
    </div>
  );
};

export default TechnicianTable;