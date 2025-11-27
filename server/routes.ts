
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateNextInvoiceNumber } from "./services/invoiceService";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  app.get("/api/next-invoice-number", async (req, res) => {
    const nextInvoiceNumber = await generateNextInvoiceNumber();
    res.json({ invoiceNumber: nextInvoiceNumber });
  });

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  return httpServer;
}
