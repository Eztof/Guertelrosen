export type Npc = {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;

  name: string;

  aka: string | null;
  species: string | null;
  culture: string | null;
  profession: string | null;
  titles: string | null;

  birth_date: string | null;
  death_date: string | null;
  birthplace: string | null;
  residence: string | null;

  affiliations: string | null;

  description: string | null;
  appearance: string | null;
  personality: string | null;
  biography: string | null;

  abilities: string | null;
  equipment: string | null;
  relationships: string | null;

  notes: string | null;
  sources: string | null;

  tags: string[] | null;
};