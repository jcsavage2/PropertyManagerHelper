import { Entity } from 'dynamodb-toolbox';
import { ENTITIES } from '.';
import { INDEXES, PillarDynamoTable } from '..';
import { uuid } from 'uuidv4';

type CreateTechnicianProps = {
  name: string;
  email: string;
  pmEmail: string;
  organization: string;
};

export interface ITechnician {
  pk: string,
  sk: string,
  created: string,
  technicianName: string,
  technicianEmail: string,
  pmEmail: string,
  organization: string,
};

export class TechnicianEntity {
  private technicianEntity: Entity;

  constructor() {
    this.technicianEntity = new Entity({
      name: ENTITIES.TECHNICIAN,
      attributes: {
        pk: { partitionKey: true },
        sk: { sortKey: true },
        GSI1PK: { type: "string" }, //PM email
        GSI1SK: { type: "string" },
        technicianName: { type: "string" },
        technicianEmail: { type: "string" },
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
  private generateTechnicianSK(uniqueId: string) {
    return ["E", uniqueId].join('#');
  }
  private generateGSI1PK({ propertyManagerEmail }: { propertyManagerEmail: string; }) {
    return ["PM", propertyManagerEmail.toLowerCase()].join("#");
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
        GSI1PK: this.generateGSI1PK({ propertyManagerEmail: pmEmail.toLowerCase() }),
        GSI1SK: this.generateTechnicianSK(uuid()),
        technicianName: name,
        technicianEmail: email.toLowerCase(),
        pmEmail: pmEmail.toLowerCase(),
        organization,
      }, { returnValues: "ALL_NEW" });
      console.log("Technician that was just created: ", result);
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
        technicianEmail: email.toLowerCase(),
        ...(name && { technicianName: name, }),
        ...(pmEmail && { pmEmail }),
        ...(organization && { organization }),
        userType: ENTITIES.TECHNICIAN
      }, { returnValues: "ALL_NEW" });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  /**
   * @returns All technicians for a given property manager
   */
  public async getAllForPropertyManager({ propertyManagerEmail }: { propertyManagerEmail: string; }) {
    try {
      const result = (await PillarDynamoTable.query(
        this.generateGSI1PK({ propertyManagerEmail }),
        {
          limit: 20,
          reverse: true,
          beginsWith: "E",
          index: INDEXES.GSI1
        }
      ));
      return result.Items ?? [];
    } catch (err) {
      console.log({ err });
    }
  }
}
