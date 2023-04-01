import { Entity } from 'dynamodb-toolbox';
import { ENTITIES } from '.';
import { PillarDynamoTable } from '..';

export class TenantEntity {
  private tenant: Entity;

  constructor() {
    this.tenant = new Entity({
      name: ENTITIES.TENANT,
      attributes: {
        pk: { partitionKey: true },
        sk: { sortKey: true },
        name: { type: "string" },
        email: { type: "string" },
        userType: { type: "string" },
        property: { type: "string" },
        status: { type: "string" },
      },
      table: PillarDynamoTable
    } as const);
  }

  private generatePk(email: string) {
    return `${email.toLowerCase()}`;
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
    { email, name, propertyManagerEmail }:
      { email: string; name?: string; propertyManagerEmail?: string; }) {
    try {
      const result = await this.tenant.update({
        pk: this.generatePk(email),
        sk: this.generateSk(),
        email: email.toLowerCase(),
        name,
        propertyManagerEmail,
        status: propertyManagerEmail ? "INVITED" : "REQUESTED_JOIN",
        userType: ENTITIES.TENANT
      }, { returnValues: "ALL_NEW" });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  /**
   * Updates a tenant's name or status.
   */
  public async update(
    { email, name, status }:
      { email: string; name?: string; status?: "INVITED" | "JOINED" | "REQUESTED_JOIN"; }) {
    try {
      const result = await this.tenant.update({
        pk: this.generatePk(email),
        sk: this.generateSk(),
        ...(name && { name }),
        ...(status && { status }),
      }, { returnValues: "ALL_NEW" });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  public async addPropertyForTenant(
    { email, propertyManagerEmail }:
      { email: string; name?: string; propertyManagerEmail: string; }) {
    try {
      const result = await this.tenant.update({
        pk: this.generatePk(email),
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
  public async get({ email }: { email: string; }) {
    try {
      const params = {
        pk: this.generatePk(email.toLowerCase()),
        sk: this.generateSk()
      };
      const result = await this.tenant.get(params, { consistent: true });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

}
