import { Router } from "express";
import { z } from "zod";
import { prisma } from "@kinsync/db";
import { requireAuth } from "../middleware/requireAuth.js";

export const familyRouter = Router();
familyRouter.use(requireAuth);

// GET /api/families – list user's families
familyRouter.get("/", async (req, res, next) => {
  try {
    const families = await prisma.family.findMany({
      where: { members: { some: { userId: req.user!.id } } },
      include: { members: { include: { user: true } } },
    });
    res.json({ families });
  } catch (err) {
    next(err);
  }
});

const CreateFamilySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

// POST /api/families – create a family
familyRouter.post("/", async (req, res, next) => {
  try {
    const data = CreateFamilySchema.parse(req.body);
    const family = await prisma.family.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        members: {
          create: { userId: req.user!.id, role: "OWNER" },
        },
      },
      include: { members: true },
    });
    res.status(201).json({ family });
  } catch (err) {
    next(err);
  }
});

// GET /api/families/:id
familyRouter.get("/:id", async (req, res, next) => {
  try {
    const family = await prisma.family.findFirst({
      where: {
        id: req.params["id"],
        members: { some: { userId: req.user!.id } },
      },
      include: { members: { include: { user: true } }, events: true },
    });
    if (!family) {
      res.status(404).json({ error: "Family not found" });
      return;
    }
    res.json({ family });
  } catch (err) {
    next(err);
  }
});
