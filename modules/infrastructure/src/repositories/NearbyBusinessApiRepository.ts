import type { AxiosInstance } from 'axios';
import type {
  NearbyBusinessRepository,
  NearbyBusiness,
  NearbyBusinessSearchFilter,
  PageRequest,
  PageResponse,
} from '@domain';

export class NearbyBusinessApiRepository implements NearbyBusinessRepository {
  constructor(private readonly client: AxiosInstance) {}

  async search(
    filter: NearbyBusinessSearchFilter,
    pageRequest: PageRequest,
  ): Promise<PageResponse<NearbyBusiness>> {
    const response = await this.client.get<PageResponse<NearbyBusiness>>('/businesses/nearby', {
      params: {
        latitude: filter.latitude,
        longitude: filter.longitude,
        categoryId: filter.categoryId,
        page: pageRequest.page,
        size: pageRequest.size,
      },
    });
    return response.data;
  }
}
