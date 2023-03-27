import { Entity } from 'dynamodb-toolbox';
import { ENTITIES, EntityType } from '.';
import { PillarDynamoTable } from '..';


export class PropertyManagerEntity {
  private propertyManagerEntity: Entity;

  constructor() {
    this.propertyManagerEntity = new Entity({
      name: ENTITIES.PROPERTY_MANAGER,
      attributes: {
        pk: { partitionKey: true },
        sk: { sortKey: true },
        name: { type: "string" },
        tenants: { type: "list" },
        properties: { type: "list" },
        email: { type: "string" },
        organization: { type: "string" },
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

  public async create({ email, name, organization, type }: { email: string; name?: string; organization?: string; type: EntityType; }) {
    try {
      const result = await this.propertyManagerEntity.update({
        pk: this.generatePk({ email }),
        sk: this.generateSk({ type }),
        email: email.toLowerCase(),
        name,
        organization,
        properties: [],
        tenants: [],
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
      const result = await this.propertyManagerEntity.get(params, { consistent: true });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

}
