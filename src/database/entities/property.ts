import { Entity } from 'dynamodb-toolbox';
import { ENTITIES } from '.';
import { PillarDynamoTable } from '..';


export class PropertyEntity {
  private propertyEntity: Entity;

  constructor() {
    this.propertyEntity = new Entity({
      name: ENTITIES.PROPERTY_MANAGER,
      attributes: {
        pk: { partitionKey: true }, // flag as partitionKey
        sk: { hidden: true, sortKey: true }, // flag as sortKey and mark hidden
        country: { type: 'string' },
        streedAddress: { type: 'string' },
        unitNumber: { type: 'string' },
        city: { type: 'string', },
        state: { type: 'string' },
        zip: { type: 'string' },
        workOrders: { type: 'list' },
      },
      table: PillarDynamoTable
    } as const);
  }

  private generatePk({ propertyManagerEmail }: { propertyManagerEmail: string; }) {
    return [ENTITIES.PROPERTY, propertyManagerEmail.toLowerCase()].join('#');
  }

  private generateSk({ streetAddress, country, city, state, zip, unitNumber }:
    { streetAddress: string; country: string; city: string; state: string; zip: string; unitNumber?: string; }) {
    return [streetAddress.toUpperCase(), country.toUpperCase(), city.toUpperCase(), state.toUpperCase(), zip, unitNumber ?? ""].join("#");
  }



  public async create({ streetAddress, country, city, state, zip, unitNumber, propertyManagerEmail }:
    { streetAddress: string; country: string; city: string; state: string; zip: string; unitNumber?: string; propertyManagerEmail: string; }) {
    const result = await this.propertyEntity.put({
      pk: this.generatePk({ propertyManagerEmail }),
      sk: this.generateSk({ streetAddress, country, city, state, zip, unitNumber }),
      country: country.toUpperCase(),
      streetAddress: streetAddress.toUpperCase(),
      city: city.toUpperCase(),
      state: state.toUpperCase(),
      zip: zip.toUpperCase(),
      unitNumber: unitNumber?.toUpperCase() ?? "",
      workOrders: []
    });
    return result.Item;
  }

  public async get({ streetAddress, country, city, state, zip, unitNumber, propertyManagerEmail }:
    { streetAddress: string; country: string; city: string; state: string; zip: string; unitNumber?: string; propertyManagerEmail: string; }) {
    const params = {
      pk: this.generatePk({ propertyManagerEmail }),
      sk: this.generateSk({ streetAddress, country, city, state, zip, unitNumber })
    };
    const result = await this.propertyEntity.get(params, { consistent: true });
    // TBU
    return result;
  }

  private async getAllWithPk({ pk }: { pk: string; }) {
    // TBU
  }

  public async getAllForPropertyManager({ propertyManagerEmail }: { propertyManagerEmail: string; }) {
    const pk = this.generatePk({ propertyManagerEmail });
    return this.getAllWithPk({ pk });

  }

}
