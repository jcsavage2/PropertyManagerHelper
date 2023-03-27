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
        organization: { type: "string" },
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

  public async create({ email, name, organization }: { email: string; name?: string; organization?: string; }) {
    try {
      const result = await this.propertyManagerEntity.update({
        pk: this.generatePk({ email }),
        sk: this.generateSk(),
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

}
