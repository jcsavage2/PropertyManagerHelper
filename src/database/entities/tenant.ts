import { Entity } from 'dynamodb-toolbox';
import { ENTITIES, EntityType } from '.';
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
        properties: { type: "list" },
        email: { type: "string" },
        userType: { type: "string" }
      },
      table: PillarDynamoTable
    } as const);
  }

  private generatePk(email: string) {
    return `${email.toLowerCase()}`;
  }

  private generateSk() {
    return ["ACCOUNT_TYPE", ENTITIES.TENANT].join("#");
  }

  public getId(email: string) {
    return { pk: this.generatePk(email) };
  }

  public async create({ email, name, properties = [], }: { email: string; name?: string; properties?: string[]; }) {
    try {
      const result = await this.tenant.update({
        pk: this.generatePk(email),
        sk: this.generateSk(),
        email: email.toLowerCase(),
        name,
        properties,
        userType: ENTITIES.TENANT
      }, { returnValues: "ALL_NEW" });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

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
