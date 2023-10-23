import Link from "next/link";

const TermsAndCondittions = () => {

  return (
    <div className="terms-and-conditions bg-white p-8 shadow-lg rounded-lg">
      <h1 className="text-2xl font-bold mb-4">Terms and Conditions for Using Pillar</h1>
      <p className="mb-4 text-gray-600"><span className="font-semibold">Last Updated:</span> September 16, 2023</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Acceptance of Terms</h2>
      <p className="mb-4">By logging in and using Pillar, you agree to comply with and be bound by the following terms and conditions.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Scope of Service</h2>
      <p className="mb-4">Pillar is a platform that allows you to submit WOs for issues in your apartment. We do not perform the repairs; we facilitate the process by passing maintenance requests to the Property Management team.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">ApiResponse Usage and Privacy Policy</h2>
      <p className="mb-4">Your name, address, and email is provided by the Property Management team. We use this data to process maintenance requests and facilitate communication between tenants and the property management team for resolution. For more details on how we handle your data, please refer to our <Link href="/privacy-policy" className="text-blue-500 hover:underline">Privacy Policy</Link>.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Legal Compliance and Dispute Resolution</h2>
      <p className="mb-4">By using this service, you acknowledge that records of maintenance request submissions may be used by the property management team for compliance with legal requirements, including but not limited to fair housing laws. These records could be disclosed in legal proceedings, audits, or disputes to demonstrate that you have been serviced in a fair and equitable manner.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Limitation of Liability</h2>
      <p className="mb-4">Pillar is not responsible for the execution or quality of any repairs resulting from your maintenance request. Any issues or disputes related to repairs should be directed to the Property Manager. Additionally, Pillar is not liable for any illegal content generated by you or other users on the platform.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Intellectual Property Rights</h2>
      <p className="mb-4">All content, trademarks, service marks, trade names, logos, and other intellectual property rights in this platform are the property of Pillar and are protected by applicable copyright and trademark laws. No material from the platform may be copied, reproduced, republished, uploaded, posted, transmitted, or distributed in any way without explicit written permission from Pillar.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">User Conduct</h2>
      <p className="mb-4">By using this service, you agree not to submit false or misleading maintenance requests. Additionally, you agree not to generate or disseminate any content that is illegal, violent, profane, or in violation of the rights of others. Misuse of the platform, including the generation of illegal content, may result in the removal of your account from the platform.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Updates to Terms</h2>
      <p className="mb-4">Pillar reserves the right to change these terms at any time. Any changes will be posted on this page.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Contact Information</h2>
      <p>For any questions about these terms, please contact <a href="mailto:pillar@pillarhq.co" className="text-blue-500 hover:underline">pillar@pillarhq.co</a>.</p>
    </div>
  );
};

export default TermsAndCondittions;