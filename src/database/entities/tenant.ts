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
        properties: { type: "list" },
        email: { type: "string" },
      },
      table: PillarDynamoTable
    } as const);
  }

  private generatePk({ email }: { email: string; }) {
    return [ENTITIES.TENANT, email.toLowerCase()].join('#');
  }

  private generateSk() {
    return "#default";
  }

  public async create({ email, name, properties = [] }: { email: string; name?: string; properties?: string[]; }) {
    const result = await this.tenant.put({
      pk: this.generatePk({ email }),
      sk: this.generateSk(),
      email: email.toLowerCase(),
      name,
      properties,
    });
    return result.Item;
  }

  public async get({ email }: { email: string; }) {
    const params = {
      pk: this.generatePk({ email: email.toLowerCase() }),
      sk: this.generateSk()
    };
    const result = await this.tenant.get(params, { consistent: true });
    return result;
  }

}
