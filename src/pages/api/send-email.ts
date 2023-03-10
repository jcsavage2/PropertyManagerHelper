import sendgrid from "@sendgrid/mail";
import { NextApiRequest, NextApiResponse } from "next";



type Data = {
  response: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const apiKey = process.env.SENDGRID_API_KEY
    if (!apiKey) {
      throw new Error("missing SENDGRID_API_KEY env variable.")
    }
    sendgrid.setApiKey(apiKey);

    await sendgrid.send({
      to: "mitchposk@gmail.com", // Your email where you'll receive emails
      from: "mitchposk@gmail.com", // your website email address here
      subject: `Some Subject...`,
      text: `Testing...`,
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({ response: error.message });
  }

  return res.status(200).json({ response: "Successfully send" });
}
