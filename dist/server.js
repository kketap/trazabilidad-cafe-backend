"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/server.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const index_1 = __importDefault(require("./routes/index"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
const parseOrigins = (value) => value
    ?.split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean) ?? [];
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:4173",
    ...parseOrigins(process.env.FRONTEND_URL),
    ...parseOrigins(process.env.FRONTEND_LOCAL_URL),
    ...parseOrigins(process.env.FRONTEND_PRODUCTION_URL),
    ...parseOrigins(process.env.CORS_ORIGINS),
];
console.log("CORS allowed origins:", allowedOrigins);
app.use((0, cors_1.default)({
    origin(origin, callback) {
        if (!origin) {
            return callback(null, true);
        }
        const normalizedOrigin = origin.replace(/\/$/, "");
        if (allowedOrigins.includes(normalizedOrigin)) {
            return callback(null, true);
        }
        return callback(new Error(`Origen no permitido: ${origin}`));
    },
    credentials: true,
}));
app.use(express_1.default.json());
app.use("/api", index_1.default);
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
//# sourceMappingURL=server.js.map