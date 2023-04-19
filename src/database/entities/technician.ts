import { Entity } from 'dynamodb-toolbox';
import { ENTITIES } from '.';
import { PillarDynamoTable } from '..';

type CreateTechnicianProps = {
  name: string;
  email: string;
  pmEmail: string;
  organization: string;
};

export class PropertyManagerEntity {
  private technicianEntity: Entity;

  constructor() {
    this.technicianEntity = new Entity({
      name: ENTITIES.PROPERTY_MANAGER,
      attributes: {
        pk: { partitionKey: true },
        sk: { sortKey: true },
        name: { type: "string" },
        email: { type: "string" },
        pmEmail: { type: "string" },
        organization: { type: "string" },
      },
      table: PillarDynamoTable
    } as const);
  }

  private generatePk({ email }: { email: string; }) {
    return ["E", email.toLowerCase()].join('#');
  }
  private generateSk() {
    return ["E", ENTITIES.TECHNICIAN].join("#");
  }

  /**
   * Creates a new technician attached to a property manager and organization.
   */
  public async create(
    { name, email, pmEmail, organization }: CreateTechnicianProps) {
    try {
      const result = await this.technicianEntity.update({
        pk: this.generatePk({ email: email.toLowerCase() }),
        sk: this.generateSk(),
        name,
        email: email.toLowerCase(),
        pmEmail: pmEmail.toLowerCase(),
        organization,
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
      const result = await this.technicianEntity.get(params, { consistent: true });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  public async update(
    { email, name, pmEmail, organization}: { email: string; name?: string; pmEmail?: string; organization?: string; }) {
    try {
      const result = await this.technicianEntity.update({
        pk: this.generatePk({ email: email.toLowerCase() }),
        sk: this.generateSk(),
        email: email.toLowerCase(),
        ...(name && { name, }),
        ...(pmEmail && { pmEmail }),
        ...(organization && { organization }),
        userType: ENTITIES.TECHNICIAN
      }, { returnValues: "ALL_NEW" });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }
}
