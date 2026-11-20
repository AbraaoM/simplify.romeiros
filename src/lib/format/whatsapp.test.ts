import { expect, test } from "vitest";
import { whatsappUrlForPhone } from "./whatsapp";

test("builds a wa.me link with the passenger phone when present", () => {
  expect(whatsappUrlForPhone("+5512981660131", "Olá")).toBe(
    "https://wa.me/5512981660131?text=Ol%C3%A1",
  );
  expect(whatsappUrlForPhone(null, "Olá")).toBe("https://wa.me/?text=Ol%C3%A1");
});
