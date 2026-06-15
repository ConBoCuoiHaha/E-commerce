// ============================================================
// CART.ROUTE.JS - ENDPOINT GIỎ HÀNG (toàn bộ cần đăng nhập)
// ============================================================

import express from "express";
import {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
  mergeCart,
} from "../controllers/cart.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  addCartItemSchema,
  updateCartItemSchema,
  mergeCartSchema,
} from "../validations/cart.validation.js";

const router = express.Router();

router.use(protectRoute); // giỏ server chỉ dành cho user đã đăng nhập

router.get("/", getCart);
router.post("/items", validate(addCartItemSchema), addCartItem);
router.put("/items/:itemId", validate(updateCartItemSchema), updateCartItem);
router.delete("/items/:itemId", removeCartItem);
router.delete("/", clearCart);
router.post("/merge", validate(mergeCartSchema), mergeCart);

export default router;
