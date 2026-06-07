export interface SearchResult {
  businessId: string;
  businessName: string;
  categoryId: string | null;
  city: string | null;
  similarityScore: number;
}
