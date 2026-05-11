export interface Business {
  id: string | null;
  name: string;
}

export interface CreateBusinessCommand {
  name: string;
}
