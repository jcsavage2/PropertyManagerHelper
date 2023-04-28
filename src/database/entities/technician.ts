import { Entity } from 'dynamodb-toolbox';
import { ENTITIES, ENTITY_KEY } from '.';
import { INDEXES, PillarDynamoTable } from '..';
import { generateKey } from '@/utils';
import { uuid } from 'uuidv4';

type CreateTechnicianProps = {
  name: string;
  email: string;
  pmEmail?: string;
  organization: string;
};

export interface ITechnician {
  pk: string,
  sk: string,
  created: string,
  technicianName: string,
  technicianEmail: string,
  userType: "TECHNICIAN";
  propertyManagers?: Map<string, string>;
  organization: string,
  skills: string[];
};

export class TechnicianEntity {
  private technicianEntity: Entity;

  constructor() {
    this.technicianEntity = new Entity({
      name: ENTITIES.TECHNICIAN,
      attributes: {
        pk: { partitionKey: true },
        sk: { sortKey: true },
        GSI1PK: { type: "string" }, //PM email
        GSI1SK: { type: "string" },
        technicianName: { type: "string" },
        propertyManagers: { type: "map" },
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
        ...(pmEmail && { GSI1PK: generateKey(ENTITY_KEY.PROPERTY_MANAGER, pmEmail.toLowerCase()) }),
        GSI1SK: generateKey(ENTITY_KEY.TECHNICIAN, uuid()),
        technicianName: name,
        userType: "TECHNICIAN",
        technicianEmail: email.toLowerCase(),
        propertyManagers: propertyManagersMap,
        organization,
      }, { returnValues: "ALL_NEW" });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  public async get({ technicianEmail }: { technicianEmail: string; }) {
    try {
      const params = {
        pk: generateKey(ENTITY_KEY.TECHNICIAN, technicianEmail.toLowerCase()),
        sk: generateKey(ENTITY_KEY.TECHNICIAN, technicianEmail.toLowerCase()),
      };
      const result = await this.technicianEntity.get(params, { consistent: true });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  public async update(
    { email, name, organization }: { email: string; name?: string; organization?: string; }) {
    try {
      const result = await this.technicianEntity.update({
        pk: generateKey(ENTITY_KEY.TECHNICIAN, email.toLowerCase()),
        sk: generateKey(ENTITY_KEY.TECHNICIAN, email.toLowerCase()),
        technicianEmail: email.toLowerCase(),
        ...(name && { technicianName: name, }),
        ...(organization && { organization }),
        status: "JOINED",
        userType: ENTITIES.TECHNICIAN
      }, { returnValues: "ALL_NEW" });
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
