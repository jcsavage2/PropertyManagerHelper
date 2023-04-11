import { Entity } from 'dynamodb-toolbox';
import { ENTITIES } from '.';
import { PillarDynamoTable } from '..';


export type CreateTenantProps = {
  tenantEmail: string;
  tenantName: string;
  pmEmail?: string;
};

export class TenantEntity {
  private tenant: Entity;

  constructor() {
    this.tenant = new Entity({
      name: ENTITIES.TENANT,
      attributes: {
        pk: { partitionKey: true },
        sk: { sortKey: true },
        pmEmail: { type: "string" },
        property: { type: "string" },
        status: { type: "string" },
        tenantEmail: { type: "string" },
        tenantName: { type: "string" },
        userType: { type: "string" },
      },
      table: PillarDynamoTable
    } as const);
  }

  private generatePk({ tenantEmail }: { tenantEmail: string; }) {
    return ["T", `${tenantEmail.toLowerCase()}`].join("#");
  }

  private generateSk() {
    return ["T", ENTITIES.TENANT].join("#");
  }

  private generateSkForProperty({ propertyManagerEmail }: { propertyManagerEmail: string; }) {
    return ["P", propertyManagerEmail].join("#");
  }


  /**
   * Creates the user record in the Database.
   */
  public async create(
    { tenantEmail, tenantName, pmEmail }: CreateTenantProps) {
    try {
      const result = await this.tenant.update({
        pk: this.generatePk({ tenantEmail }),
        sk: this.generateSk(),
        tenantEmail: tenantEmail.toLowerCase(),
        tenantName,
        ...(pmEmail && { pmEmail: pmEmail?.toLowerCase() }),
        status: "INVITED",
        userType: ENTITIES.TENANT
      }, { returnValues: "ALL_NEW", strictSchemaCheck: true });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  /**
   * Updates a tenant's name or status.
   */
  public async update(
    { tenantEmail, tenantName, status }:
      { tenantEmail: string; tenantName?: string; status?: "INVITED" | "JOINED" | "REQUESTED_JOIN"; }) {
    try {
      const result = await this.tenant.update({
        pk: this.generatePk({ tenantEmail }),
        sk: this.generateSk(),
        ...(tenantName && { tenantName }),
        ...(status && { status }),
      }, { returnValues: "ALL_NEW" });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  public async addPropertyForTenant(
    { tenantEmail, propertyManagerEmail }:
      { tenantEmail: string; propertyManagerEmail: string; }) {
    try {
      const result = await this.tenant.update({
        pk: this.generatePk({ tenantEmail }),
        sk: this.generateSkForProperty({ propertyManagerEmail }),
        propertyManagerEmail,
      }, { returnValues: "ALL_NEW" });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  /**
   * Returns the tenant's user record from the database.
   */
  public async get({ tenantEmail }: { tenantEmail: string; }) {
    try {
      const params = {
        pk: this.generatePk({ tenantEmail }),
        sk: this.generateSk()
      };
      const result = await this.tenant.get(params, { consistent: true });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

}
