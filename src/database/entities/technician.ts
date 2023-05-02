import { Entity, EntityItem } from 'dynamodb-toolbox';
import { ENTITIES, ENTITY_KEY } from '.';
import { IBaseEntity, INDEXES, PillarDynamoTable } from '..';
import { generateKey } from '@/utils';
import { uuid } from 'uuidv4';


type CreateTechnicianProps = {
  name: string;
  email: string;
  status?: "JOINED" | "INVITED";
  pmEmail?: string;
  organization: string;
};

type ITechnicianBase = {
  pk: string,
  sk: string,
  technicianName: string,
  technicianEmail: string,
  userType: "TECHNICIAN";
  status: "JOINED" | "INVITED";
  propertyManagers?: Map<string, string>;
  organization: string,
};

export interface ITechnician extends IBaseEntity {
  pk: string,
  sk: string,
  technicianName: string,
  technicianEmail: string,
  userType: "TECHNICIAN";
  propertyManagers?: Map<string, string>;
  organization: string,
};

type CompositKey = {
  pk: string;
  sk: string;
};

export class TechnicianEntity {
  private technicianEntity: Entity<"TECHNICIAN", ITechnicianBase, CompositKey, typeof PillarDynamoTable>;

  constructor() {
    this.technicianEntity = new Entity<"TECHNICIAN", ITechnicianBase, CompositKey, typeof PillarDynamoTable>({
      name: ENTITIES.TECHNICIAN,
      attributes: {
        // Technician Email 
        pk: { partitionKey: true },
        // Technician Email 
        sk: { sortKey: true },

        // PM Email
        GSI1PK: { type: "string" },
        // KSUID - timestamp
        GSI1SK: { type: "string" },

        technicianName: { type: "string" },

        // Map <pmEmail, pmName>
        propertyManagers: { type: "map" },

        // Invited || Joined
        status: { type: "string" },
        technicianEmail: { type: "string" },
        pmEmail: { type: "string" },
        organization: { type: "string" },
      },
      table: PillarDynamoTable
    } as const);
  }

  /**
   * Creates a new technician attached to a property manager and organization.
   */
  public async create(
    { name, email, pmEmail, organization }: CreateTechnicianProps) {
    const propertyManagersMap = new Map();
    pmEmail && propertyManagersMap.set(pmEmail, pmEmail);
    try {
      /**
       * We first need to attempt to create the Technician.
       * If the technician already exists, we must only update the value of the propertyManager map and the GSI1PK/GSI1SK.
       * We need one consistent profile though so that when the technician comes to the app, 
       * they are able to fetch their profile with pk and sk (with their email alone).
       * We must additionally create a companion row with the Property Manager email as the SK
       * so we are able to perform the getAll technicians for 
       */
      const result = await this.technicianEntity.update({
        pk: generateKey(ENTITY_KEY.TECHNICIAN, email.toLowerCase()),
        sk: generateKey(ENTITY_KEY.TECHNICIAN, email.toLowerCase()),
        technicianName: name,
        userType: "TECHNICIAN",
        status: "INVITED",
        technicianEmail: email.toLowerCase(),
        propertyManagers: propertyManagersMap,
        organization,
      }, { returnValues: "ALL_NEW" });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }


  public async get({ technicianEmail }: { technicianEmail: string; }): Promise<ITechnician | null> {
    try {
      const params = {
        pk: generateKey(ENTITY_KEY.TECHNICIAN, technicianEmail.toLowerCase()),
        sk: generateKey(ENTITY_KEY.TECHNICIAN, technicianEmail.toLowerCase()),
      };
      const result = await this.technicianEntity.get(params, { consistent: true });
      return result.Item ?? null;
    } catch (err) {
      console.log({ err });
      return null;
    }
  }



  public async update(
    { technicianEmail, technicianName, organization, status }: Partial<ITechnicianBase>) {
    if (!technicianEmail) {
      throw new Error(" No Technician email provided");
    }
    const lowerCaseTechEmail = technicianEmail.toLowerCase();
    try {
      const result = await this.technicianEntity.update({
        pk: generateKey(ENTITY_KEY.TECHNICIAN, lowerCaseTechEmail),
        sk: generateKey(ENTITY_KEY.TECHNICIAN, lowerCaseTechEmail),
        ...(technicianName && { technicianName }),
        ...(organization && { organization }),
        ...(status && { status }),
        userType: ENTITIES.TECHNICIAN
      } as any, { returnValues: "ALL_NEW" });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  /**
   * @returns All technicians for a given property manager
   */
  public async getAllForPropertyManager({ propertyManagerEmail }: { propertyManagerEmail: string; }) {
    try {
      const result = (await PillarDynamoTable.query(
        generateKey(ENTITY_KEY.PROPERTY_MANAGER, propertyManagerEmail.toLowerCase()),
        {
          limit: 20,
          reverse: true,
          beginsWith: `${ENTITY_KEY.TECHNICIAN}#`,
          index: INDEXES.GSI1
        }
      ));
      return result.Items ?? [];
    } catch (err) {
      console.log({ err });
    }
  }
}
