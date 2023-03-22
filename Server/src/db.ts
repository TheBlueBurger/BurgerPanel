import mongoose from 'mongoose';
import nodeCrypto from 'node:crypto';
// use mongoose unless u want to pain urself
mongoose.set("strictQuery", false);
let db = await mongoose.connect(process.env.BURGERPANEL_MONGODB || "mongodb://burgerpanel:burgerpanel@localhost:27017/burgerpanel");

db.connection.on('error', console.error.bind(console, 'connection error:'));
console.log("Connected to database");
export let users = db.model("User", new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        maxlength: 20,
        required: true
    },
    admin: Boolean,
    createdAt: { type: Date, default: Date.now },
    token: {
        type: String,
        default: () => nodeCrypto.randomBytes(64).toString("base64url")
    }
}));
export let servers = db.model("Server", new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        maxlength: 16
    },
    path: {
        type: String,
        unique: true,
        maxlength: 255
    },
    mem: Number,
    allowedUsers: [String],
    version: {
        type: String,
        maxlength: 16,
    },
    software: {
        type: String,
        maxlength: 7,
    },
    port: {
        min: 1,
        max: 65535,
        type: Number,
        unique: true
    },
    autoStart: {
        type: Boolean,
        default: false
    }
}));
export let settings = db.model("Setting", new mongoose.Schema({
    key: {
        type: String,
        unique: true,
        maxlength: 255,
    },
    value: {
        type: String,
        maxlength: 255,
    },
}));

// Ensure that a admin user exists
let admin = await users.findOne({ admin: true }).exec();
if (!admin) {
    console.log("No admin user found. Creating one.");
    admin = new users({
        username: "admin_" + Date.now(),
        admin: true
    });
    admin.isNew = true;
    await admin.save();
    console.log("Admin user created with token: " + admin.token);
}
