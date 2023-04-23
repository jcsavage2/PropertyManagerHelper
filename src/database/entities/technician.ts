import { Entity } from 'dynamodb-toolbox';
import { ENTITIES, ENTITY_KEY } from '.';
import { INDEXES, PillarDynamoTable } from '..';
import { generateKey } from '@/utils';
import { uuid } from 'uuidv4';

type CreateTechnicianProps = {
  name: string;
  email: string;
  pmEmail: string;
  organization: string;
};

export interface ITechnician {
  pk: string,
  sk: string,
  created: string,
  technicianName: string,
  technicianEmail: string,
  pmEmail: string,
  organization: string,
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
    try {
      const result = await this.technicianEntity.update({
        pk: generateKey(ENTITY_KEY.TECHNICIAN, email.toLowerCase()),
        sk: generateKey(ENTITY_KEY.PROPERTY_MANAGER, pmEmail.toLowerCase()),
        GSI1PK: generateKey(ENTITY_KEY.PROPERTY_MANAGER, pmEmail.toLowerCase()),
        GSI1SK: generateKey(ENTITY_KEY.TECHNICIAN, uuid()),
        technicianName: name,
        technicianEmail: email.toLowerCase(),
        pmEmail: pmEmail.toLowerCase(),
        organization,
      }, { returnValues: "ALL_NEW" });
      console.log("Technician that was just created: ", result);
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  public async get({ technicianEmail, pmEmail }: { technicianEmail: string; pmEmail: string; }) {
    try {
      const params = {
        pk: generateKey(ENTITY_KEY.TECHNICIAN, technicianEmail.toLowerCase()),
        sk: generateKey(ENTITY_KEY.PROPERTY_MANAGER, pmEmail.toLowerCase()),
      };
      const result = await this.technicianEntity.get(params, { consistent: true });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  public async update(
    { email, name, pmEmail, organization}: { email: string; name?: string; pmEmail: string; organization?: string; }) {
    try {
      const result = await this.technicianEntity.update({
        pk: generateKey(ENTITY_KEY.TECHNICIAN, email.toLowerCase()),
        sk: generateKey(ENTITY_KEY.PROPERTY_MANAGER, pmEmail.toLowerCase()),
        technicianEmail: email.toLowerCase(),
        ...(name && { technicianName: name, }),
        ...(pmEmail && { pmEmail }),
        ...(organization && { organization }),
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
          beginsWith: "E",
          index: INDEXES.GSI1
        }
      ));
      return result.Items ?? [];
    } catch (err) {
      console.log({ err });
    }
  }
}
