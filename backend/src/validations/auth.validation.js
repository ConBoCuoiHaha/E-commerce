// ============================================================
// AUTH.VALIDATION.JS - SCHEMA ZOD CHO TOÀN BỘ LUỒNG AUTH (Phase 3)
// ------------------------------------------------------------
// Vẫn KHÔNG có trường "role" trong signup -> chống tự phong admin.
// ============================================================

import { z } from "zod";

const objectIdSchema = z
  .string("ID phải là chuỗi")
  .regex(/^[0-9a-fA-F]{24}$/, "ID không hợp lệ");

// Token gửi qua email: 64 ký tự hex (32 byte) - chặn sớm chuỗi rác
const emailTokenSchema = z
  .string("Token phải là chuỗi")
  .regex(/^[0-9a-f]{64}$/, "Token không hợp lệ");

export const signupSchema = z.object({
  name: z.string("Tên phải là chuỗi").trim().min(2, "Tên ít nhất 2 ký tự").max(50),
  username: z
    .string("Tên đăng nhập phải là chuỗi")
    .trim()
    .toLowerCase()
    .min(3, "Tên đăng nhập ít nhất 3 ký tự")
    .max(30, "Tên đăng nhập tối đa 30 ký tự")
    .regex(/^[a-z0-9_]+$/, "Tên đăng nhập chỉ gồm chữ thường, số và dấu gạch dưới"),
  email: z.email("Email không đúng định dạng").toLowerCase(),
  password: z
    .string("Mật khẩu phải là chuỗi")
    .min(6, "Mật khẩu ít nhất 6 ký tự")
    .max(100, "Mật khẩu tối đa 100 ký tự"),
});

export const loginSchema = z.object({
  // identifier = username HOẶC email (controller tự nhận diện qua "@")
  identifier: z
    .string("Tên đăng nhập/email phải là chuỗi")
    .trim()
    .min(1, "Vui lòng nhập tên đăng nhập hoặc email"),
  password: z.string("Mật khẩu phải là chuỗi").min(1, "Vui lòng nhập mật khẩu"),
});

export const verifyEmailSchema = z.object({
  id: objectIdSchema,
  token: emailTokenSchema,
});

export const forgotPasswordSchema = z.object({
  email: z.email("Email không đúng định dạng").toLowerCase(),
});

export const resetPasswordSchema = z.object({
  id: objectIdSchema,
  token: emailTokenSchema,
  password: z
    .string("Mật khẩu phải là chuỗi")
    .min(6, "Mật khẩu ít nhất 6 ký tự")
    .max(100, "Mật khẩu tối đa 100 ký tự"),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Tên ít nhất 2 ký tự").max(50).optional(),
  password: z.string().min(6, "Mật khẩu ít nhất 6 ký tự").max(100).optional(),
});
