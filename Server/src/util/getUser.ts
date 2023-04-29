import mongoose from "mongoose";
import { users, roles } from "../db.js"
import { User } from "../../../Share/User.js";
let obj: {[key: string]: 1} = {};
Object.keys(users.schema.paths).map(key => obj[key] = 1);
export default async function getUser(id: string): Promise<User> {
    let result = await users.aggregate(
        [
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(id)
                }
            },
            {
                $lookup: {
                    from: "roles",
                    let: {roleIds: "$roles"},
                    pipeline: [
                        {
                            $match: {
                                $and: [
                                    {$expr: {$in: ["$_id", "$$roleIds"]}},
                                    {type: "user"}
                                ]
                            },
                        },
                        {
                            $lookup: {
                                from: "roles",
                                let: {inheritedIds: "$inheritsFrom"},
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $in: ["$_id", "$$inheritedIds"]
                                            }
                                        }
                                    }
                                ],
                                as: "inheritsFrom"
                            }
                        }
                    ],
                    as: "roles"
                },
            },
            {
                $project: {
                    ...obj,
                    roles: 1
                }
            }
        ]
    );
    return result[0];
}
