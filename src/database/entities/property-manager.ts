import { Entity } from 'dynamodb-toolbox';
import { ENTITIES, ENTITY_KEY } from '.';
import { PillarDynamoTable } from '..';
import { generateKey } from '@/utils';

type AddTenantProps = {
  tenantEmail: string;
  tenantName?: string;
  organization?: string;
  pmEmail: string;
};

type CreatePropertyManagerProps = {
  pmEmail: string;
  pmName?: string;
  organization?: string;
};

export class PropertyManagerEntity {
  private propertyManagerEntity: Entity;

  constructor() {
    this.propertyManagerEntity = new Entity({
      name: ENTITIES.PROPERTY_MANAGER,
      attributes: {
        pk: { partitionKey: true },
        sk: { sortKey: true },
        pmName: { type: "string" },
        pmEmail: { type: "string" },
        organization: { type: "string" },
        userType: { type: "string" },
        tenantName: { type: "string" },
        tenantEmail: { type: "string" },
        technicians: { type: "map" }
      },
      table: PillarDynamoTable
    } as const);
  }
  
  /**
    * Generates the SK for a property who is added by a property manager.
    * We create a companion row under the property manager so we can efficiently query for a property manager's properties. 
    */
  private generateSkForProperty({ addressPk, addressSk }: { addressPk: string; addressSk: string; }) {
    return ["P", addressPk, addressSk].join("#");
  }

  /**
   * Creates as new property manager user entity.
   */
  public async create(
    { pmEmail, pmName, organization, }: CreatePropertyManagerProps) {
    try {
      const result = await this.propertyManagerEntity.update({
        pk: generateKey(ENTITY_KEY.PROPERTY_MANAGER, pmEmail.toLowerCase()),
        sk: generateKey(ENTITY_KEY.PROPERTY_MANAGER, ENTITIES.PROPERTY_MANAGER),
        pmEmail: pmEmail.toLowerCase(),
        pmName,
        organization,
        userType: ENTITIES.PROPERTY_MANAGER
      }, { returnValues: "ALL_NEW" });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  /**
   * Adds a companion row to the property manager that has some metadata about a tenant.
   * Note, when this happens, the API will also need to create the tenant user entity record with a status of "INVITED".
   */
  public async createTenantCompanionRow(
    {
      organization,
      pmEmail,
      tenantEmail,
      tenantName,
    }: AddTenantProps) {
    try {
      const result = await this.propertyManagerEntity.update({
        pk: generateKey(ENTITY_KEY.PROPERTY_MANAGER, pmEmail.toLowerCase()),
        sk: generateKey(ENTITY_KEY.TENANT, ENTITIES.TENANT),
        tenantEmail: tenantEmail.toLowerCase(),
        tenantName: tenantName?.toLocaleLowerCase(),
        organization,
      }, { returnValues: "ALL_NEW" });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  /**
  * Adds a companion row to the property manager that has some metadata about a tenant.
  * Addresses can only be created by property managers, so the address PK will always match the property manager's PK. 
  */
  public async createPropertyCompanionRow(
    { email, organization, addressPk, addressSk }:
      { email: string; organization?: string; addressPk: string; addressSk: string; }) {
    try {
      const result = await this.propertyManagerEntity.update({
        pk: generateKey(ENTITY_KEY.PROPERTY_MANAGER, email.toLowerCase()),
        sk: this.generateSkForProperty({ addressPk, addressSk }),
        organization,
      }, { returnValues: "ALL_NEW" });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  public async getAllUnits({ propertyManagerEmail }: { propertyManagerEmail: string; }) {
    try {
      const result = await this.propertyManagerEntity.query(
        generateKey(ENTITY_KEY.PROPERTY_MANAGER, propertyManagerEmail.toLowerCase()),
        {
          beginsWith: "T#",
          reverse: true,
        }
      );
    } catch (err) {
      console.log({ err });
    }
  }

  public async get({ email }: { email: string; }) {
    try {
      const params = {
        pk: generateKey(ENTITY_KEY.PROPERTY_MANAGER, email.toLowerCase()),
        sk: generateKey(ENTITY_KEY.PROPERTY_MANAGER, ENTITIES.PROPERTY_MANAGER)
      };
      const result = await this.propertyManagerEntity.get(params, { consistent: true });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  public async update(
    { email, name, organization, tenants, properties }:
      { email: string; name?: string; organization?: string; tenants?: string[], properties?: string[]; }) {
    try {
      const result = await this.propertyManagerEntity.update({
        pk: generateKey(ENTITY_KEY.PROPERTY_MANAGER, email.toLowerCase()),
        sk: generateKey(ENTITY_KEY.PROPERTY_MANAGER, ENTITIES.PROPERTY_MANAGER),
        pmEmail: email.toLowerCase(),
        ...(name && { name, }),
        ...(organization && { organization }),
        userType: ENTITIES.PROPERTY_MANAGER
      }, { returnValues: "ALL_NEW" });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  //Add technician to property manager technicians map
  public async addTechnician(
    { pmEmail, technicianEmail }:
      { pmEmail: string; technicianEmail: string; }) {
    try {
      const result = await this.propertyManagerEntity.update({
        pk: generateKey(ENTITY_KEY.PROPERTY_MANAGER, pmEmail.toLowerCase()),
        sk: generateKey(ENTITY_KEY.PROPERTY_MANAGER, ENTITIES.PROPERTY_MANAGER),
        technicians: {
            $set: {
                [technicianEmail.toLowerCase()]: technicianEmail.toLowerCase()
            }
        }
      }, { returnValues: "ALL_NEW" });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }
}
