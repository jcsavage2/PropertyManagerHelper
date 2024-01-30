This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Development

To ensure you have a working setup, copy the sample.env file and retrieve secret values from project admins.

Start the dev environment with:

```bash
yarn dev

```test......

### Future Improvements

- Add Organizations with multiple property managers.
- Batch import property managers and respective tenants/properties for an organization.
- Add service partners for specific issues (configurable for a single property or groups of properties).
- Ability to take pictures for a work order.
- Ability to set a date and time for the service worker.
- Add penalties for No-Shows for Tenants (EG if the tenant does not show up).

### When to Notify (send an email)

- Send email to Tenant when they are invited
- Send email to Technician when they are assigned a Work Order
- Send email to Technician if a work order is moved from "Complete" back to "In Progress"
