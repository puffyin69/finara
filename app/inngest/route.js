import { Inngest } from "inngest";
import {serve} from "inngest/next";
export const inngest = new Inngest({
    id:"finance-tracker-app",
    name:"AI Finance Tracker App Inngest",
})

export default serve({
    client:inngest,
    functions:[
    ]
})



