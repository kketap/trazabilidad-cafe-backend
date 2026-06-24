"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/app.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const routes_1 = __importDefault(require("./routes"));
const app = (0, express_1.default)();
const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_LOCAL_URL,
    process.env.FRONTEND_PRODUCTION_URL,
].filter(Boolean);
console.log("CORS allowed origins:", allowedOrigins);
app.use((0, cors_1.default)({
    origin(origin, callback) {
        if (!origin) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    credentials: true,
}));
app.use(express_1.default.json({ limit: "20mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)("dev"));
app.use("/api", routes_1.default);
app.use((_req, res) => {
    res.status(404).json({
        ok: false,
        message: "Ruta no encontrada",
    });
});
exports.default = app;
//# sourceMappingURL=app.js.map