import { z } from "zod";

const ROLES = ["top", "jungla", "medio", "adc", "soporte"];
const TAGS = ["control", "dano", "tanque", "movilidad", "sustain"];
const CURRENT_YEAR = new Date().getFullYear();

const abilityText = z.string().trim().min(2, "cada habilidad debe tener al menos 2 caracteres").max(60, "cada habilidad admite hasta 60 caracteres");

const abilitiesSchema = z.object({ passive: abilityText, q: abilityText, w: abilityText, e: abilityText, r: abilityText }).strict();

const championBodySchema = z
  .object({
    name: z.string().trim().min(2, "name debe tener al menos 2 caracteres").max(30, "name admite hasta 30 caracteres"),
    role: z.enum(ROLES, { message: `role debe ser uno de: ${ROLES.join(", ")}` }),
    difficulty: z.number().int("difficulty debe ser un entero").min(1).max(10),
    tags: z
      .array(z.enum(TAGS, { message: `cada tag debe ser una de: ${TAGS.join(", ")}` }))
      .min(1, "tags debe tener al menos 1 elemento")
      .max(5, "tags admite hasta 5 elementos")
      .refine((tags) => new Set(tags).size === tags.length, "tags no puede tener valores repetidos"),
    releaseYear: z.number().int().min(2009, `releaseYear debe ser ${2009} o posterior`).max(CURRENT_YEAR, `releaseYear no puede ser posterior a ${CURRENT_YEAR}`),
    abilities: abilitiesSchema,
  })
  .strict();

const championUpdateSchema = championBodySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "Debes enviar al menos un campo para actualizar" });

const championQuerySchema = z.object({ role: z.enum(ROLES).optional(), minDifficulty: z.coerce.number().int().min(1).max(10).optional() }).strict();

const idParamSchema = z.object({ id: z.coerce.number({ message: "id debe ser un entero positivo" }).int("id debe ser un entero positivo").positive("id debe ser un entero positivo") });

export { championBodySchema, championUpdateSchema, championQuerySchema, idParamSchema, ROLES, TAGS };
