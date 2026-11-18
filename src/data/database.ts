import { openDatabaseAsync } from "expo-sqlite";
import { randomUUID } from "expo-crypto";
import { Repository } from "./repository";

let opening: Promise<Repository> | undefined;
export function openRepository(): Promise<Repository> {
  if (!opening)
    opening = (async () => {
      const database = await openDatabaseAsync("freezerpal.db");
      const repository = new Repository(database, randomUUID);
      try {
        await repository.initialize();
        return repository;
      } catch (error) {
        await database.closeAsync();
        throw error;
      }
    })().catch((error: unknown) => {
      opening = undefined;
      throw error;
    });
  return opening;
}
