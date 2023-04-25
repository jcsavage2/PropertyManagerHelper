import { toTitleCase } from "@/utils";
import { useEffect, useState } from "react";
import { ITechnician } from "@/database/entities/technician";
import { v4 as uuid } from "uuid";

export type TechnicianTableProps = {
  technicians: ITechnician[];
};

export const TechnicianCards = (props: TechnicianTableProps) => {
  const [technicians, setTechnicians] = useState<Array<ITechnician>>([]);

  useEffect(() => {
    setTechnicians(props.technicians);
  }, [props]);

  const columns: { label: string, accessor: keyof ITechnician; width: string; }[] = [
    { label: "Name", accessor: "technicianName", width: "w-56" },
    { label: "Email", accessor: "technicianEmail", width: "" },
    { label: "Joined", accessor: "created", width: "" },
  ];

  const formattedTechnicians = technicians.map(tech => {
    const { technicianName, technicianEmail, created } = tech;
    const date = new Date(created);
    const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    return {
      pk: tech.pk,
      sk: tech.sk,
      technicianName: toTitleCase(technicianName),
      technicianEmail,
      created: formattedDate,
      pmEmail: tech.pmEmail,
      organization: tech.organization,
    };
  });

  return (
    <div className="mt-8">
      <div className="grid gap-y-2">
        {technicians.map((technician, index) => {
          return (
            <div
              className="py-4 px-2 bg-gray-100 rounded w-full"
              key={`${technician.pk}-${technician.sk}-${index}`}
            >

              <p className="text-xl text-gray-800">{technician.technicianName} </p>
              <p className="text-lg">{technician.skills ?? "Plumbing, Electrical"}</p>
              <p className="text-sm mt-1">{technician.technicianEmail} </p>
              <p className="text-sm">{technician.organization ?? "Some Organization Inc."}</p>
            </div>
          );
        })}
      </div >
    </div>
  );
};

export default TechnicianCards;