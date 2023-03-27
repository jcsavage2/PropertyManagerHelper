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
      },
      table: PillarDynamoTable
    } as const);
  }

  private generatePk({ email }: { email: string; }) {
    return [email.toLowerCase()].join('#');
  }

  private generateSk({ type }: { type: EntityType; }) {
    return ["ACCOUNT_TYPE", type].join("#");
  }

  public async create({ email, name, properties = [], type }: { email: string; name?: string; properties?: string[]; type: EntityType; }) {
    try {
      const result = await this.tenant.update({
        pk: this.generatePk({ email }),
        sk: this.generateSk({ type }),
        email: email.toLowerCase(),
        name,
        properties,
      }, { returnValues: "ALL_NEW" });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  public async get({ email, type }: { email: string; type: EntityType; }) {
    try {
      const params = {
        pk: this.generatePk({ email: email.toLowerCase() }),
        sk: this.generateSk({ type })
      };
      const result = await this.tenant.get(params, { consistent: true });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

}
