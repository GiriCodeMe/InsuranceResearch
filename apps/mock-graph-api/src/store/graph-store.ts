import type { Entity, Relation } from "@insurance-kb/contracts";

/** In-memory property graph. Reset/reseed are the only way to reach a known state (deterministic E2E tests). */
export class GraphStore {
  private entities = new Map<string, Entity>();
  private relations: Relation[] = [];

  reset(): void {
    this.entities.clear();
    this.relations = [];
  }

  createEntities(newEntities: Entity[]): void {
    for (const entity of newEntities) {
      const existing = this.entities.get(entity.name);
      if (existing) {
        existing.observations = [...new Set([...existing.observations, ...entity.observations])];
      } else {
        this.entities.set(entity.name, { ...entity, observations: [...entity.observations] });
      }
    }
  }

  createRelations(newRelations: Relation[]): void {
    for (const relation of newRelations) {
      const alreadyExists = this.relations.some(
        (r) => r.from === relation.from && r.to === relation.to && r.relationType === relation.relationType
      );
      if (!alreadyExists) {
        this.relations.push(relation);
      }
    }
  }

  addObservations(entries: { entityName: string; contents: string[] }[]): void {
    for (const entry of entries) {
      const entity = this.entities.get(entry.entityName);
      if (!entity) {
        throw new Error(`Unknown entity: ${entry.entityName}`);
      }
      entity.observations = [...new Set([...entity.observations, ...entry.contents])];
    }
  }

  readGraph(): { entities: Entity[]; relations: Relation[] } {
    return { entities: [...this.entities.values()], relations: [...this.relations] };
  }

  openNodes(names: string[]): Entity[] {
    return names.map((name) => this.entities.get(name)).filter((e): e is Entity => e !== undefined);
  }

  searchNodes(query: string): Entity[] {
    const q = query.toLowerCase();
    return [...this.entities.values()].filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.entityType.toLowerCase().includes(q) ||
        e.observations.some((o) => o.toLowerCase().includes(q))
    );
  }
}
