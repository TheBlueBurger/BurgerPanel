import mongoose from "mongoose";
import { servers } from "../db.js"
import { Server } from "../../../Share/Server.js";
let obj: { [key: string]: 1 } = {};
Object.keys(servers.schema.paths).map(key => obj[key] = 1);
delete obj.allowedUsers;
export default async function getServer(id: string): Promise<Server> {
    /*
    {  
        ...server,
        allowedUsers: [
            {
                "id": "riuehgniuehnbiuhgrteu",
                "permissions": ["some perm", "another perm"],
                "roles": [ObjectId("some id")]
            }
        ] so it is ObjectId? ObjectId[]
    }
    =>
    {  
        ...server,
        allowedUsers: [
            {
                "id": "riuehgniuehnbiuhgrteu",
                "permissions": ["some perm", "another perm"],
                "roles": [{
                    name: "yup",
                    inheritsFrom: [...],
                    etc etc
                }]
            }
        ]
    }
    */

    /*
    let result2 = await servers.aggregate(
        [
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(id)
                }
            },
            
            {
                $lookup: {
                    from: "roles",
                    localField: "allowedUsers.roles",
                    foreignField: "_id",
                    as: "allowedUsers.rolesObj"
                }
            }, //Ig can you try to run it and see the current output? ill try it
            {
                $lookup: {
                    from: "roles",
                    localField: "allowedUsers.rolesObj.inheritsFrom",
                    foreignField: "_id",
                    as: "allowedUsers.rolesObj.inheritsFromObj"
                }
            },
            {
                $project: {
                    ...obj,
                    roles: 1, // hmmm should this exist
                    
                    allowedUsers: {
                        $map: {
                            input: "$allowedUsers",
                            as: "allowedUsr",
                            in: {
                                user: "$$allowedUsr.user",
                                roles: {
                                    $map: {
                                        input: "$$allowedUsr.rolesObj",
                                        as: "rObj",
                                        in: {
                                            _id: "$$rObj._id",
                                            name: "$$rObj.name",
                                            inheritsFrom: {
                                                $map: {
                                                    input: "$$rObj.inheritsFromObj",
                                                    as: "ifo",
                                                    in: {
                                                        _id: "$$ifo._id",
                                                        name: "$$ifo.name"
                                                    }
                                                }
                                            }
                                        }
                                    }
                                },
                                permissions: "$$allowedUsr.permissions"
                            }
                        }
                    }
                }
            }
        ]
    );
    console.log(result2);
    */
    let result = await servers.aggregate([
        {$match: {
            _id: new mongoose.Types.ObjectId(id)
        }},
        // unwind the allowedUsers array
        { $unwind: "$allowedUsers" },
      
        // lookup the user's roles from the roles collection
        {
          $lookup: {
            from: "roles",
            localField: "allowedUsers.roles",
            foreignField: "_id",
            as: "allowedUsers.roles"
          }
        },
      
        // unwind the roles array within each user
        { $unwind: "$allowedUsers.roles" },
      
        // lookup the inherited roles from the roles collection
        {
          $lookup: {
            from: "roles",
            localField: "allowedUsers.roles.inheritsFrom",
            foreignField: "_id",
            as: "allowedUsers.roles.inheritsFrom"
          }
        },
        
        // group the results back by server, reconstructing the allowedUsers array
        {
          $group: {
            _id: "$_id",
            allowedUsers: {
              $push: {
                user: "$allowedUsers.user",
                roles: {
                  $mergeObjects: [
                    "$allowedUsers.roles",
                    { inheritsFrom: { $arrayElemAt: ["$allowedUsers.roles.inheritsFrom", 0] } }
                  ]
                }
              }
            }
          }
        }
      ]).exec()
      console.log(result)
     /*
    let result = await servers.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(id)
          }
        },
        {
          $lookup: {
            from: "roles",
            localField: "allowedUsers.roles",
            foreignField: "_id",
            as: "allowedUsers.rolesObj"
          }
        },
        {
          $project: {
            ...obj,
            roles: 1,
            allowedUsers: {
              $map: {
                input: "$allowedUsers",
                as: "allowedUsr",
                in: {
                  user: "$$allowedUsr.user",
                  roles: {
                    $map: {
                      input: "$$allowedUsr.rolesObj",
                      as: "rObj",
                      in: {
                        _id: "$$rObj._id",
                        name: "$$rObj.name",
                        inheritsFrom: {
                          $map: {
                            input: "$$rObj.inheritsFrom",
                            as: "if",
                            in: {
                              $let: {
                                vars: {
                                  r: {
                                    $arrayElemAt: [
                                      {
                                        $filter: {
                                          input: "$allowedUsers.rolesObj",
                                          as: "allowedRole",
                                          cond: {
                                            $eq: ["$$allowedRole._id", "$$if"]
                                          }
                                        }
                                      },
                                      0
                                    ]
                                  }
                                },
                                in: {
                                  _id: "$$r._id",
                                  name: "$$r.name",
                                  inheritsFrom: {
                                    $map: {
                                      input: "$$r.inheritsFrom",
                                      as: "if2",
                                      in: {
                                        $let: {
                                          vars: {
                                            r2: {
                                              $arrayElemAt: [
                                                {
                                                  $filter: {
                                                    input: "$allowedUsers.rolesObj",
                                                    as: "allowedRole",
                                                    cond: {
                                                      $eq: ["$$allowedRole._id", "$$if2"]
                                                    }
                                                  }
                                                },
                                                0
                                              ]
                                            }
                                          },
                                          in: {
                                            _id: "$$r2._id",
                                            name: "$$r2.name"
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  },
                  permissions: "$$allowedUsr.permissions"
                }
              }
            }
          }
        }
      ]);
    */
   /*
   let result = await servers.aggregate([
    {
        $match: {
            _id: new mongoose.Types.ObjectId(id)
        }
    },
    {
        $lookup: {
            from: "roles",
            localField: "allowedUsers.roles",
            foreignField: "_id",
            as: "allowedUsers.rolesObj"
        }
    },
    {
        $unwind: "$allowedUsers"
    },
    {
        $lookup: {
            from: "users",
            localField: "allowedUsers.user",
            foreignField: "_id",
            as: "allowedUsers.userObj"
        }
    },
    {
        $lookup: {
            from: "roles",
            localField: "allowedUsers.rolesObj.inheritsFrom",
            foreignField: "_id",
            as: "allowedUsers.rolesObj.inheritsFromObj"
        }
    },
    {
        $project: {
            ...obj,
            roles: 1,
            allowedUsers: {
                $map: {
                    input: "$allowedUsers",
                    as: "allowedUsr",
                    in: {
                        user: "$$allowedUsr.user",
                        roles: {
                            $map: {
                                input: "$$allowedUsr.rolesObj",
                                as: "rObj",
                                in: {
                                    _id: "$$rObj._id",
                                    name: { $first: "$$rObj.name" },
                                    inheritsFrom: {
                                        $map: {
                                            input: "$$rObj.inheritsFromObj",
                                            as: "ifo",
                                            in: {
                                                _id: "$$ifo._id",
                                                name: { $first: "$$ifo.name" }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        permissions: "$$allowedUsr.permissions"
                    }
                }
            }
        }
    }
]);*/
    return result[0];
}
