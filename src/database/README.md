### Query Access Patterns

- Get all properties for a property manager
- Get all property managers for an Organization
- Get all Tenants for a property manager 
- Get all work orders for a property 
- Get all work orders for a property manager
- Get all work orders for a tenant 
- Get a property manager for a tenant 

### User Paths
#### Property Manager (PM)
**When** PM invites a tenant to app.
**Then** Tenant should be created in the Database with "INVITED" status.
**And** A companion row for the property manager should be created with the tenant associated with them. 
**And** A companion row for the property manager should be created with the tenant's property associated. 
**And** A companion row for the Tenant should be created with the tenants' property and the PM's contact info.
**And** Email should be sent to the tenant with the invite link(their email should be appended to the invite URL).

#### Tenant
**Given** Tenant receives an invite email to the app.
**When** Tenant logs into the app with their email.
**Then** They should immediately be able to go fill out a work order, having their email, name, address, and property manager information filled out for their profile.

**Given** Tenant has filled out a work order.
**When** Tenant submits the work order.
**Then** The tenant and property manager should be sent an email (together) with the work order details.

**Given** Tenant has previously submitted a work order.
**When** Tenant goes to the tenant's portal.
**Then** They should have the ability to view all historical work orders.

#### Technician
**Given** There is an existing work order with no technicians assigned and existing technicians.
**When** Property Manager assigns an existing technician to the work order.

**Given** There is an existing work order with no technicians assigned and no existing technicians for the property manager.
**When** Property Manager goes to assign a technician to the work order.
**Then** The PM should have the ability to +Add a new technician via a modal, which they can then attach to the work order.
**And** We should create both the companion 

