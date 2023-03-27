import { Entity } from 'dynamodb-toolbox';
import { ENTITIES } from '.';
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
        company: { type: "string" },
      },
      table: PillarDynamoTable
    } as const);
  }

  private generatePk({ email }: { email: string; }) {
    return [ENTITIES.PROPERTY_MANAGER, email.toLowerCase()].join('#');
  }

  private generateSk() {
    return "#default";
  }

  public async create({ email, name, company }: { email: string; name?: string; company?: string; }) {
    const result = await this.propertyManagerEntity.put({
      pk: this.generatePk({ email }),
      sk: this.generateSk(),
      name,
      tenants: [],
      properties: [],
      email: email.toLowerCase(),
      company,

    });
    return result.Item;
  }

  public async get({ email }: { email: string; }) {
    const params = {
      pk: this.generatePk({ email: email.toLowerCase() }),
      sk: this.generateSk()
    };
    const result = await this.propertyManagerEntity.get(params, { consistent: true });
    return result;
  }

}
