import { z } from "zod";

export const ChunkSchema = z.object({
  chunkId: z.string().min(1),
  documentId: z.string().min(1),
  anchor: z.string().min(1),
  text: z.string().min(1)
});
export type Chunk = z.infer<typeof ChunkSchema>;
