db.createUser({
        user: "burgerpanel",
        pwd: "burgerpanel",
        roles: [
            {
                role: "readWrite",
                db: "burgerpanel"
            }
        ]
});