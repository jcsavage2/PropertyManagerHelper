import { AiJSONResponse } from "@/types";


export const findIssueSample: AiJSONResponse = {
  aiMessage: "<your AI generated conversational response>",
  issueDescription: "<value of the issueDescription>",
  issueLocation: "<value of issueLocation>",
};

export const issueCategoryToTypes = {
  "Basement": ["Leaking", "Humid"],
  "Bathtub": ["Drain Clogged", "Won't turn on", "Low Water Pressure", "Rusty", "No Hot Water"],
  "Ceiling": ["Leaking", "Cracked"],
  "Chandalier": ["Fallen", "Won't Turn On"],
  "Dishwasher": ["Won't Run", "Overflowing", "Not Cleaning The Dishes"],
  "Door": ["Off the Rail", "Won't Open/Close", "Won't Lock", "Can't get in"],
  "Dryer": ["Doesn't Dry", "Takes Multiple Runs", "Won't Start"],
  "Electrical": ["Light bulb out", "Heating not working", "AC not working"],
  "Faucet": ["Leaking", "Won't turn on", "Drain Clogged", "Low Pressure", "Rusty", "No Hot Water"],
  "Floor": ["Needs Cleaning", "Missing"],
  "Fridge": ["Fridge not running", "Freezer not running", "Fridge leaking", "Freezer leaking", "Light Is Out", "Filter Needs Replacement"],
  "Hazard": ["Mold", "Asbestos", "Gas Leak", "Fire", "Flood"],
  "Humidifer": ["Broken", "Not De-Humidifying"],
  "Lawn": ["Needs To Be Cut", "Needs To Be Sprayed", "Has "],
  "Lightbulb": ["Won't Turn On", "Flickering"],
  "Microwave": ["Won't Turn On"],
  "Oven": ["Oven won't turn on", "Not Getting Hot"],
  "Pests": ["Mice/Rats", "Termites", "Roaches/Cockroaches", "Ants", "Fruit Flies"],
  "Roof": ["Dilapidated", "Missing Sections", "Crack", "Snow Pile-up"],
  "Shower": ["Drain Clogged", "Won't turn on", "Low Pressure", "Rusty", "No Hot Water"],
  "Sliding Door/Screen": ["Off the Track", "Ripped"],
  "Stove": ["Won't Turn On", "Not Getting Hot"],
  "Toilet": ["Leaking from Base", "Leaking from Tank", "Not flushing", "Clogged", "Weak Flush"],
  "Transition Strip": ["Broken"],
  "TV": ["Won't Turn On", "Nothing Displays When On", "Can't Connect to Internet"],
  "Walls": ["Leaking", "Hole"],
  "Washer": ["No Water", "No Hot Water", "Won't Start"],
  "Window": ["Shattered", "Cracked", "Won't Open", "Won't Close"],
} as Record<string, string[]>;

export const Events = {
    STATUS_UPDATE: "STATUS_UPDATE",
    ASSIGNED_TO_UPDATE: "ASSIGNED_TO_UPDATE",
    COMMENT_UPDATE: "COMMENT_UPDATE"
}
