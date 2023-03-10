import { createClient } from "next-sanity"

export const client = createClient({
  projectId: "s5ypecxw",
  dataset: "production",
  apiVersion: "2022-03-25",
  useCdn: true
})