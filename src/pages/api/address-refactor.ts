import { EventEntity } from '@/database/entities/event';
import { WorkOrderEntity } from '@/database/entities/work-order';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { IUser, USER_TYPE, UserEntity } from '@/database/entities/user';
import { deconstructKey, generateAddressKey } from '@/utils';
import { ENTITIES, ENTITY_KEY, createAddressString, generateAddressSk } from '@/database/entities';
import { Record } from 'twilio/lib/twiml/VoiceResponse';
import { PropertyEntity } from '@/database/entities/property';
import _ from 'lodash';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ response: any }>
) {
  const session = await getServerSession(req, res, options);
  //@ts-ignore
  const sessionUser: IUser = session?.user;

  //User must be a pm to unassign a technician from a WO
  if (!session || !sessionUser?.roles?.includes(USER_TYPE.PROPERTY_MANAGER)) {
    res.status(401);
    return;
  }
  try {
    const userEntity = new UserEntity();
    const workOrderEntity = new WorkOrderEntity();
    const propertyEntity = new PropertyEntity();
    //const list = await userEntity.scanDB({ organization: 'f43ec8f5-ff7f-44c9-bc3a-d77c3ef4d3ce' });
    const list = await userEntity.scanDB({ organization: 'pillartesting' });
    return res.status(200).json({ response: list })
    // let list: any[] = [];
    // list.push(await userEntity.get({ email: 'jcsavage@umich.edu' }));

    //TODO: update for simco organization
    //let properties: any[] = [];

    // //for each in prop list, fetch the property by id and append it to properties
    // for (let i = 0; i < propList.length; i++) {
    //   const property = await propertyEntity.getById({ uuid: propList[i] });
    //   if (!property || property.length === 0) {
    //     console.log('ERROR: property not found for uid: ', propList[i]);
    //   } else {
    //     properties.push(property[0]);
    //   }
    // }

    // return res.status(200).json({ response: { properties } });

    const duplicatePropertyMap: { [duplicateId: string]: string } = {
      '8fc5bf50-ce20-4448-9fd9-c278293ade07': '07f62f54-acc4-43cb-9956-bb9343203fc8',
      '4c535251-a41c-4cfe-9ead-534f907a6f2f': '19386a06-fefb-4a87-88c3-318fd279918e',
      '499896a5-92bb-43e0-96ba-385740186237': '9bfdc79d-6d87-4d6d-bba4-d97bc81082b2',
      '2030f7f3-9277-4dc8-b971-97f908f9a476': '21fa3c72-4b3a-4874-be16-ea6850903d47',
      '8d5ef4d5-7e25-42fa-bc6a-32486544cdf0': 'a4d9eb55-83b8-41fd-8933-590003766d38',
      '7d2765b2-25e2-4db8-bf77-03377d000f02': '0bff20c4-e659-40fa-a458-9a5e6e9efaf5',
      '3cd52dce-25f7-41d9-840e-85b36d193aa9': '2d3affa7-059e-4a0f-8c25-c1ecfb1f0e47',
      'c23d19b6-8925-4f23-ac82-18d484f6077b': '2d3affa7-059e-4a0f-8c25-c1ecfb1f0e47',
      '552bdeef-9376-470f-a9fd-458fb241ba56': '12985f79-554f-44e8-8166-91ebb5ef2b2f',
      '8d87d0ac-81cb-476d-914f-dd7c29f9a2a6': '146b7f61-a3d4-4f22-8b76-46262eccb37f',
      'e2cb798f-7d2d-4067-9be1-367e01751f27': '5c6eac86-2b50-4a3e-af3e-8123b837317a',
      '1dab8d82-cf4f-4f43-8c4d-bf19c2f1d5cb': '0895cc9b-eecf-4d04-af95-ac102a2c1581',
      '4937fe7d-39bf-4cba-a113-ec002f2c03ff': '9d82b83c-ff3c-4d94-89c1-853437df0b65',
      'f3619de7-fccf-4d36-a46f-6ceaffd91294': 'a4d15ea3-ec61-4ca4-9dc2-8cd6609a04f2',
      'a8b4cc80-93e8-41c5-8c79-3c84ac5abc29': '076bb381-dc98-4c8f-990e-8e5e095d901f',
      'c2a1d950-6b44-4058-81dd-e828f32ce840': '50ac1e19-d77b-442f-b05c-6541d46acc11',
      '70bb8b38-eea7-4929-b84f-dc6affb5dd31': 'dc705a08-55f6-4825-a472-9f6d279e0ed4',
      'ceddf551-4923-43ea-be04-97c28a11c2ff': 'fef119ee-f3ed-4a21-b83d-601e4ab4e699',
      '453e7e31-95e6-44bf-adec-00c4916cbff0': '1b814952-1885-425f-b1c6-097eca817b1c',
      'a6f04fd7-fe07-4149-94dd-0ba3ac3e8ae4': '1b814952-1885-425f-b1c6-097eca817b1c',
      '22c6e7a0-7ac7-4156-b6d5-86801de32dda': 'e270a4c1-4c2d-4d1a-9c30-748d01618c88',
      'eae2b33e-8524-48d8-b495-9517c0f0ec1e': '18d74651-0e13-4424-8029-c48fa2a23503',
      'd3dacf0d-dc2e-4d63-986a-e7f8042f5e44': 'd8592b9c-2998-4fc4-98ea-226e7d5dcb4f',
      '67dca8d6-0c5b-4c91-ae7a-77c08fef42c7': 'd8592b9c-2998-4fc4-98ea-226e7d5dcb4f',
      '531d1aa0-d9bd-4ef3-b463-aa07337db9a4': 'd8592b9c-2998-4fc4-98ea-226e7d5dcb4f',
    };
    //const duplicatePropertyMap: { [duplicateId: string]: string } = {};

    const tenantsAtPropertyMap: { [propertyId: string]: string[] } = {};

    let oldUsers: any[] = [];
    let newUsers: any[] = [];
    let oldProperties: any[] = [];
    let newProperties: any[] = [];

    if (!list) return res.status(200).json({ response: '' });

    //After getting full list

    // //For each entry in the list
    // list.forEach(async (entry) => {
    //   oldUsers.push(_.cloneDeep(entry));
    //   if (entry.addresses) {
    //     //@ts-ignore
    //     let oldAddressMap: Record<string, any> = entry.addresses;
    //     //@ts-ignore
    //     let newAddressMap: Record<string, any> = {};
    //     let addressString: string = '';
    //     let primaryAddress: any = {};

    //     //For each address in the addresses list
    //     for (let olduid in oldAddressMap) {
    //       let property = oldAddressMap[olduid];
    //       let correctuid = olduid;

    //       if (duplicatePropertyMap[olduid]) {
    //         //If duplicate exists, then use the source of truth property for the address
    //         correctuid = duplicatePropertyMap[olduid];
    //         const properties = await propertyEntity.getById({ uuid: correctuid });

    //         if (!properties) {
    //           console.log('ERROR: property not found for uid: ', correctuid);
    //         } else {
    //           property = properties[0];
    //         }

    //         newAddressMap[correctuid] = {
    //           address: property.address.trim().toUpperCase(),
    //           city: property.city.trim().toUpperCase(),
    //           country: property.country.trim().toUpperCase(),
    //           postalCode: property.postalCode.trim().toUpperCase(),
    //           state: property.state.trim().toUpperCase(),
    //           unit: property.unit?.trim().toUpperCase(),
    //           numBeds: property.numBeds,
    //           numBaths: property.numBaths,
    //           isPrimary: oldAddressMap[olduid].isPrimary,
    //         };
    //       } else {
    //         newAddressMap[correctuid] = {
    //           address: property.address.trim().toUpperCase(),
    //           city: property.city.trim().toUpperCase(),
    //           country: property.country.trim().toUpperCase(),
    //           postalCode: property.postalCode.trim().toUpperCase(),
    //           state: property.state.trim().toUpperCase(),
    //           unit: property.unit?.trim().toUpperCase(),
    //           numBeds: property.numBeds,
    //           numBaths: property.numBaths,
    //           isPrimary: property.isPrimary,
    //         };
    //       }

    //       if (newAddressMap[correctuid].isPrimary) {
    //         primaryAddress = newAddressMap[correctuid];
    //       }

    //       addressString += createAddressString({
    //         address: property.address.trim().toUpperCase(),
    //         city: property.city.trim().toUpperCase(),
    //         country: property.country.trim().toUpperCase(),
    //         postalCode: property.postalCode.trim().toUpperCase(),
    //         state: property.state.trim().toUpperCase(),
    //         unit: property.unit?.trim().toUpperCase(),
    //       });

    //       if (tenantsAtPropertyMap[correctuid]) {
    //         if (!tenantsAtPropertyMap[correctuid].includes(entry.email)) {
    //           tenantsAtPropertyMap[correctuid].push(entry.email);
    //         }
    //       } else {
    //         tenantsAtPropertyMap[correctuid] = [entry.email];
    //       }
    //     }

    //     entry.addresses = newAddressMap;
    //     entry.addressString = addressString;
    //     entry.GSI4SK =
    //       generateAddressSk({
    //         entityKey: ENTITY_KEY.TENANT,
    //         address: primaryAddress.address.trim().toUpperCase(),
    //         city: primaryAddress.city.trim().toUpperCase(),
    //         country: primaryAddress.country.trim().toUpperCase(),
    //         postalCode: primaryAddress.postalCode.trim().toUpperCase(),
    //         state: primaryAddress.state.trim().toUpperCase(),
    //         unit: primaryAddress.unit?.trim().toUpperCase(),
    //       }) +
    //       '#' +
    //       entry.email;

    //      userEntity.updateRow(entry);
    //   }
    //   newUsers.push(entry);
    // });

    // //For each entry in the list
    // for (const [key, values] of Object.entries(tenantsAtPropertyMap)) {
    //   const properties = await propertyEntity.getById({ uuid: key });
    //   if (!properties || properties.length === 0) {
    //     console.log('ERROR: property not found for uid: ', key);
    //     throw new Error('Property not found');
    //   }
    //   const property = properties[0];
    //   oldProperties.push(_.cloneDeep(property));
    //   if (
    //     !property ||
    //     !property.address ||
    //     !property.city ||
    //     !property.country ||
    //     !property.postalCode ||
    //     !property.state
    //   ) {
    //     console.log('ERROR: property not found for uid: ', key);
    //     throw new Error('Property not found');
    //   }

    //   property.tenantEmails = values;
    //   property.address = property.address.trim().toUpperCase();
    //   property.city = property.city.trim().toUpperCase();
    //   property.country = property.country.trim().toUpperCase();
    //   property.postalCode = property.postalCode.trim().toUpperCase();
    //   property.state = property.state.trim().toUpperCase();
    //   if (property.unit) property.unit = property.unit?.trim().toUpperCase();

    //   const newSk = generateAddressSk({
    //     entityKey: ENTITY_KEY.PROPERTY,
    //     address: property.address.trim().toUpperCase(),
    //     city: property.city.trim().toUpperCase(),
    //     country: property.country.trim().toUpperCase(),
    //     postalCode: property.postalCode.trim().toUpperCase(),
    //     state: property.state.trim().toUpperCase(),
    //     unit: property.unit?.trim().toUpperCase(),
    //   });

    //   if (property.sk !== newSk) {
    //     property.sk = newSk;
    //     property.GSI1SK = newSk;
    //     property.GSI4SK = newSk;
    //   }

    //   await propertyEntity.updateRow(property);
    //   newProperties.push(property);
    // }

    // // loop through all keys in duplicate map and delete every property pointed to by the id in the key 
    // for (const [key, value] of Object.entries(duplicatePropertyMap)) {
    //   const properties = await propertyEntity.getById({ uuid: key });
    //   if (!properties || properties.length === 0) {
    //     console.log('ERROR: property not found for uid: ', key);
    //     //throw new Error('Property not found');
    //   }
    //   //@ts-ignore
    //   const property = properties[0];
    //   console.log('deleting property: ', property);
    //   await propertyEntity.delete({ pk: property.pk, sk: property.sk });
    // }

    // console.log('oldUsers: ', oldUsers);
    // console.log('newUsers: ', newUsers);
    // console.log('oldProperties: ', oldProperties);
    // console.log('newProperties: ', newProperties);
    return res.status(200).json({ response: { oldUsers, newUsers, oldProperties, newProperties } });
  } catch (error) {
    console.error(error);
  }
}
