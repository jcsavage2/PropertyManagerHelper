import { Data } from "@/database";
import { EventEntity } from "@/database/entities/event";
import { WorkOrderEntity } from "@/database/entities/work-order";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { options } from "./auth/[...nextauth]";
import { IUser, userRoles } from "@/database/entities/user";
import { RemoveTechnicianSchema } from "@/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
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
    const body = RemoveTechnicianSchema.parse(req.body);
    const { workOrderId, pmEmail, technicianEmail, technicianName, pmName, oldAssignedTo, oldViewedWO } = body;

    const eventEntity = new EventEntity();
    const workOrderEntity = new WorkOrderEntity();
    await eventEntity.create({
      workOrderId,
      madeByEmail: pmEmail,
      madeByName: pmName,
      message: `Removed ${technicianName} from the work order`,
    });
    
    const response = await workOrderEntity.removeTechnician({ workOrderId: workOrderId, technicianEmail, technicianName, assignedTo: oldAssignedTo, viewedWO: oldViewedWO });

    return res.status(200).json({ response: JSON.stringify(response) });
  } catch (error) {
    console.error(error);
  }
}