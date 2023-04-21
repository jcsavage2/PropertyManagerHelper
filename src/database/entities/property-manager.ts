import { Entity } from 'dynamodb-toolbox';
import { ENTITIES } from '.';
import { PillarDynamoTable } from '..';

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
        tenantEmail: { type: "string" }
      },
      table: PillarDynamoTable
    } as const);
  }

  private generatePk({ email }: { email: string; }) {
    return ["PM", email.toLowerCase()].join('#');
  }
  private generateSk() {
    return ["PM", ENTITIES.PROPERTY_MANAGER].join("#");
  }

  /**
   * Generates the SK for a tenant who is added by a property manager.
   * We create a companion row under the property manager so we can efficiently query for a property manager's tenants. 
   */
  private generateSkForTenant() {
    return ["T", ENTITIES.TENANT].join("#");
  }

  /**
    * Generates the SK for a property who is added by a property manager.
    * We create a companion row under the property manager so we can efficiently query for a property manager's properties. 
    */
  private generateSkForProperty({ addressPk, addressSk }: { addressPk: string; addressSk: string; }) {
    return ["P", addressPk, addressSk].join("#");
  }

  /**
    * Generates the SK for a workOrder that exists for a given property manager.
    * We create a companion row under the property manager so we can efficiently query for a property manager's work orders. 
    */
  private generateSkForWorkOrder({ workOrderPk }: { workOrderPk: string; }) {
    return ["WO", workOrderPk].join("#");
  }



  /**
   * Creates as new property manager user entity.
   */
  public async create(
    { pmEmail, pmName, organization, }: CreatePropertyManagerProps) {
    try {
      const result = await this.propertyManagerEntity.update({
        pk: this.generatePk({ email: pmEmail.toLowerCase() }),
        sk: this.generateSk(),
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
        pk: this.generatePk({ email: pmEmail }),
        sk: this.generateSkForTenant(),
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
        pk: this.generatePk({ email }),
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
        this.generatePk({ email: propertyManagerEmail }),
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
        pk: this.generatePk({ email: email.toLowerCase() }),
        sk: this.generateSk()
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
        pk: this.generatePk({ email }),
        sk: this.generateSk(),
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
}
