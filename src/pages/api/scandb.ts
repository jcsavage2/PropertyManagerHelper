import { Data } from "@/database";
import { EventEntity } from "@/database/entities/event";
import { WorkOrderEntity } from "@/database/entities/work-order";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { options } from "./auth/[...nextauth]";
import { IUser, userRoles } from "@/database/entities/user";
import { deconstructKey } from "@/utils";


export type RemoveTechnicianBody = {
  workOrderId: string;
  pmEmail: string;
  pmName: string
  technicianEmail: string;
  technicianName: string;
  oldAssignedTo: Set<string>;
  oldViewedWO: string[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{response: any}>
) {
  const session = await getServerSession(req, res, options);
  //@ts-ignore
  const sessionUser: IUser = session?.user;

  //User must be a pm to unassign a technician from a WO
  if (!session || !sessionUser?.roles?.includes(userRoles.PROPERTY_MANAGER)) {
    res.status(401);
    return;
  }
  try {

    const eventEntity = new EventEntity();
    const workOrderEntity = new WorkOrderEntity();
    const woList = await workOrderEntity.getTemp({organization: 'f43ec8f5-ff7f-44c9-bc3a-d77c3ef4d3ce'})
    
    let brokenList: any[] = []
    // Use Promise.all to wait for all async operations to complete
    if(!woList) return res.status(200).json({ response: JSON.stringify(brokenList) })

    await Promise.all(
      woList.map(async (wo) => {
        if (!wo) return;
        const eventList = await eventEntity.getTemp({ woId: deconstructKey(wo.pk) });
        if (eventList && eventList.length > 1) {
          console.log("Work Order broken: ", wo);

          brokenList.push({ pk: wo.pk, sk: wo.sk, modified: wo.modified, tenantEmail: wo.tenantEmail, tenantName: wo.tenantName, pmEmail: wo.pmEmail, events: eventList });
        }
      })
    );
    
    console.log("Broken List: ", brokenList.length)

    return res.status(200).json({ response: brokenList });
  } catch (error) {
    console.error(error);
  }
}