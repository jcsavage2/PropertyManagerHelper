const PrivacyPolicy = () => {
  return (
    <div className="privacy-policy bg-white p-8 shadow-lg rounded-lg">
      <h1 className="text-2xl font-bold mb-4">Privacy Policy</h1>
      <p className="mb-4 text-gray-600">
        <span className="font-semibold">Last Updated:</span> September 16, 2023
      </p>

      <p>
        This Privacy Policy describes how Pillar collects, uses, and discloses information, and what
        choices you have with respect to the information.
      </p>
      <p className="mb-4">
        Updates in this version of the Privacy Policy reflect changes in data protection law.
      </p>
      <p>
        We respect your privacy and are committed to safeguarding your personal information. This
        privacy policy outlines the types of information we collect, how we use it, and the steps we
        take to protect it.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Personal Information</h2>
      <p>When you use our services, we collect your name, address, and email.</p>
      <p className="mb-4">
        You can always choose to provide less information. However, omitting some of this personal
        information may limit your ability to access all of the benefits of our website and
        services. For example, if you are a tenant, we cannot accurately store your maintenance
        requests for the property management team to service without your name and address.
        Similarly, we cannot send you confirmation or updates on your maintenance requests without
        your email.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Automatically Collected Information</h2>
      <p>
        We automatically collect data on how our users visit{' '}
        <a href="https://pillarhq.co" className="text-blue-500 hover:underline">
          https://pillarhq.co
        </a>
        , such as your IP address, location, browser, browser language, operating system, device
        identifiers, and cookies. Our website currently uses cookies to enhance its functionality.
        You may disable cookies in your web browser, but this may limit your ability to access{' '}
        <a href="https://pillarhq.co" className="text-blue-500 hover:underline">
          https://pillarhq.co
        </a>
        .
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">How We Use Your Information</h2>
      <p className="mb-4">
        We use your information to help the property management team track and resolve maintenance
        requests and to contact you with relevant updates about your maintenance requests.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Sharing Information with Third Parties</h2>
      <p className="mb-4">
        We may share your information with 3rd Parties to analyze system usage and improve our
        services to you. This includes session recordings and/or feedback surveys to understand
        interactions with our system and how it could better serve you.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        Length of time personal information is stored
      </h2>
      <p className="mb-4">
        We may store your personal information for an extended period of time, depending on how we
        need to use the information. For example, we will keep your email, name, and address on file
        as long as you have an account with us or as long as the property management team needs to
        store records of your maintenance requests. We store this information in order to provide
        our services of coordinating and storing maintenance requests for the property management
        team and its tenants.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Information Security</h2>
      <p>
        We use appropriate technical and organizational measures to protect the information we
        collect and store. Unfortunately, no security measures can be 100% secure, and we cannot
        guarantee the security of your information. Data leaks and malicious attacks do happen.
        Please understand that while we do our best to protect your data, providing your personal
        information is at your own risk.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Data Management</h2>
      <p className="mb-4">
        Updating and deleting data is controlled by the property management users in our
        application. If you are a tenant and would like to have your data updated or deleted in our
        system, please contact your property management team to do so.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">{"Children's Privacy"}</h2>
      <p className="mb-4">
        Our Services are not directed to children, and we do not knowingly collect personal
        information from children under 13. If we find out that a child under 13 has given us
        personal information, we will take steps to delete that information.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Changes to this Policy</h2>
      <p className="mb-4">
        We may modify this Privacy Policy from time to time. When we do, we will provide notice to
        you by publishing the most current version and revising the date at the top of this page.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Contacting Us</h2>
      <p>
        If you have questions about this policy, please feel free to contact us at:{' '}
        <a href="mailto:pillar@pillarhq.co" className="text-blue-500 hover:underline">
          pillar@pillarhq.co
        </a>
      </p>
    </div>
  );
};

export default PrivacyPolicy;
