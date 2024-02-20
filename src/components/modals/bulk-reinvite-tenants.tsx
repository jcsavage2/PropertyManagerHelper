import axios from 'axios';
import { useCallback, useState } from 'react';
import { getTenantDisplayEmail, renderToastError, renderToastSuccess, toTitleCase } from '@/utils';
import { useUserContext } from '@/context/user';
import { IUser, USER_TYPE } from '@/database/entities/user';
import { INVITE_STATUS, NO_EMAIL_PREFIX, USER_PERMISSION_ERROR } from '@/constants';
import Modal from './modal';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { MdClear } from 'react-icons/md';
import { LoadingSpinner } from '../loading-spinner';
import MobileCard from '../mobile-card';
import { useDocument } from '@/hooks/use-document';

const modalId = 'bulk-reinvite-tenants';

export type BulkReinviteTenantsModalProps = {};

export const BulkReinviteTenantsModal = ({}: BulkReinviteTenantsModalProps) => {
  const { user } = useSessionUser();
  const { userType, altName } = useUserContext();
  const {clientDocument} = useDocument();

  const [loading, setLoading] = useState(false);
  const [tenantsToReinvite, setTenantsToReinvite] = useState<IUser[]>([]);

  const fetchTenants = useCallback(async () => {
    if (!user || !userType) return;
    setLoading(true);
    try {
      if (!user || userType !== USER_TYPE.PROPERTY_MANAGER || !user.roles?.includes(USER_TYPE.PROPERTY_MANAGER)) {
        throw new Error(USER_PERMISSION_ERROR);
      }

      const { data } = await axios.post('/api/get-all-tenants-for-org', {
        organization: user.organization,
        fetchAllTenants: true,
      });
      const response = JSON.parse(data.response);
      const _tenants: IUser[] = response.tenants;

      //Exclude tenants who have already joined or have no email
      setTenantsToReinvite(_tenants.filter((t) => t.status !== INVITE_STATUS.JOINED && !t.email.startsWith(NO_EMAIL_PREFIX)));
    } catch (err) {
      console.log({ err });
    }
    setLoading(false);
  }, [user, userType]);

  const handleReinviteTenants = useCallback(async () => {
    setLoading(true);
    try {
      if (!user || !user.roles?.includes(USER_TYPE.PROPERTY_MANAGER) || userType !== USER_TYPE.PROPERTY_MANAGER) {
        throw new Error(USER_PERMISSION_ERROR);
      }

      const batchedTenants = tenantsToReinvite.reduce(
        (batches, tenant, i) => {
          const batchNumber = Math.floor(i / 5);
          if (!batches[batchNumber]) {
            batches[batchNumber] = [];
          }
          batches[batchNumber].push(tenant);
          return batches;
        },
        {} as Record<number, { name: string; email: string }[]>
      );

      const batchedRequests = Object.values(batchedTenants).map((tenants) => {
        return axios.post('/api/reinvite-tenants', {
          pmName: altName ?? user.name,
          tenants,
          organizationName: user.organizationName,
        });
      });

      const allResponses = await Promise.all(batchedRequests);
      const successfulResponses = allResponses.map((r) => r.status === 200);

      if (successfulResponses.length === allResponses.length) {
        renderToastSuccess(`${allResponses.length === 1 ? 'Re-invitation' : 'All Re-invitations'} successfully sent`);
        closeModal();
      }
      if (successfulResponses.length !== allResponses.length && successfulResponses.length > 0) {
        renderToastError(undefined, `${successfulResponses.length} Re-invitations successfully sent`, modalId);
      }
      if (!successfulResponses.length) {
        renderToastError(undefined, 'No re-invitations were successfully sent - please contact Pillar for this bug.', modalId);
      }
    } catch (err) {
      console.error(err);
      renderToastError(err, 'Error sending reinvite email(s)', modalId);
    }
    setLoading(false);
  }, [user, altName, tenantsToReinvite, modalId]);

  function closeModal() {
    (clientDocument?.getElementById(modalId) as HTMLFormElement)?.close();
  }

  return (
    <Modal id="bulk-reinvite-tenants" openButtonText="Bulk Re-Invite" onOpen={fetchTenants}>
      <div className="w-full flex flex-col text-center items-center justify-center mt-4">
        <div>Are you sure? This will resend an invitation email to ALL tenants who have not yet joined.</div>
        {!loading ? <div className="italic mt-2">This action will email all {tenantsToReinvite.length} of the tenants in this list.</div> : null}
        <div className="overflow-y-scroll max-h-96 h-96 w-full px-4 py-2 border rounded border-base-300 mt-2">
          {tenantsToReinvite && tenantsToReinvite.length ? (
            tenantsToReinvite.map((tenant: IUser, i) => {
              const correctedEmail = getTenantDisplayEmail(tenant.email);
              return (
                <MobileCard key={'reinvitelist' + tenant.name + tenant.email + i} marginBottom='mb-2' padding='p-2'>
                  <div className="flex flex-row items-center">
                    <div className="flex flex-col overflow-hidden w-11/12">
                      <p>{toTitleCase(tenant.name)}</p> <p>{correctedEmail}</p>
                    </div>
                    <MdClear
                      className={`h-6 w-6 text-error cursor-pointer ${loading && 'opacity-50 pointer-events-none'}`}
                      onClick={() => {
                        if (loading) return;
                        setTenantsToReinvite(tenantsToReinvite.filter((t) => t.email !== tenant.email));
                      }}
                    />
                  </div>
                </MobileCard>
              );
            })
          ) : (
            <div>No tenants to reinvite</div>
          )}
          {loading ? <LoadingSpinner /> : null}
        </div>
        <div className="flex flex-row md:w-1/2 w-3/4 mx-auto justify-between mt-6">
          <button
            className="w-full btn btn-primary"
            disabled={loading || !tenantsToReinvite.length}
            onClick={() => {
              if (loading || !tenantsToReinvite.length) return;
              handleReinviteTenants();
            }}
          >
            {loading ? <LoadingSpinner /> : 'Re-Invite Tenants'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
