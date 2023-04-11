import Image from 'next/image';
import { useUserContext } from "@/context/user";
import Link from 'next/link';
import { CiLocationOn } from "react-icons/ci";
import { RiFilePaper2Fill } from "react-icons/ri";
import { BsFillPersonFill } from "react-icons/bs";
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from "axios";

const WorkOrders = () => {
  const { user } = useUserContext();
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState([]);

  useEffect(() => {
    async function get() {
      const { data } = await axios.post("/api/get-all-work-orders-for-pm", { propertyManagerEmail: user.pmEmail });
      const orders = JSON.parse(data.response);
      console.log({ orders });
      orders.length && setWorkOrders(orders);

    }
    get();
  }, [user.pmEmail]);

  return (
    <div id="testing" className="mx-4 mt-4" style={{ display: "grid", gridTemplateColumns: "1fr 3fr", columnGap: "2rem" }}>
      <div>
        <Image className="mx-auto" src="/2.png" alt='1' width={100} height={0} />
        <hr style={{ height: "2px", color: "#e5e7eb", backgroundColor: "#e5e7eb" }} />
        <div className="mt-4" style={{ display: "grid", rowGap: "0.5rem" }}>
          <div className='inline'>
            <RiFilePaper2Fill className='inline mr-1 my-auto' />
            <Link className='inline my-auto' href={"work-orders"}>Work Orders</Link>
          </div>
          <div className='inline'>
            <BsFillPersonFill className='inline mr-1 my-auto' />
            <Link href={"tenants"}>Tenants</Link>
          </div>
          <div className='inline'>
            <CiLocationOn className='inline mr-1 my-auto' />
            <Link href={"properties"}>Properties</Link>
          </div>
        </div>
      </div>
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <h1 className="text-4xl">{`Work Orders`}</h1>
          <button
            className="bg-blue-200 p-2 mb-auto text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 h-6/12 w-40 justify-self-end text-center"
          >+ New Work Order</button>
        </div>
        <table className='w-full mt-8'>
          <thead className=''>
            <tr className='text-left text-gray-400'>
              <th className='font-normal'>Title</th>
              <th className='font-normal'>Status</th>
              <th className='font-normal'>Address</th>
              <th className='font-normal'>Assigned To</th>
              <th className='font-normal'>Created</th>
              <th className='font-normal'>Created By</th>
            </tr>
          </thead>
          <tbody className='text-gray-700'>
            {workOrders.map((wo: any) => {
              const date = new Date(wo.created);
              console.log({ date });
              return (
                <tr className='hover:bg-blue-200 cursor-pointer' key={`${wo.pk}-${wo.sk}`}>
                  <td>
                    {`${wo.issueCategory} - ${wo.issueSubCategory}`}
                  </td>
                  <td>
                    {wo.sk.split("#")[1] === "TO_DO" ? "To Do" : "Done"}
                  </td>
                  <td>
                    {"123 King St"}
                  </td>
                  <td>
                    {"Eddie Eng"}
                  </td>
                  <td>
                    {`${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`}
                  </td>
                  <td>
                    {"Tom Tenant"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WorkOrders;