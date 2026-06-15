// ============================================================
// WISHLIST.ROUTE.JS - ENDPOINT YÊU THÍCH (toàn bộ cần đăng nhập)
// ============================================================

import express from "express";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} from "../controllers/wishlist.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protectRoute); // mọi route wishlist đều phải đăng nhập

router.get("/", getWishlist);
router.post("/:productId", addToWishlist);
router.delete("/:productId", removeFromWishlist);

export default router;
