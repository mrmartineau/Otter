import {
  DEFAULT_API_RESPONSE_LIMIT,
  DEFAULT_API_RESPONSE_ORDER,
} from '../../constants';
import { RequestOrder, Status } from '../../types/api';

export interface BaseApiParameters {
  limit: number;
  offset: number;
  order: RequestOrder;
  status: Status;
  type: string | null;
  tag: string | null;
  top: boolean | null;
}

export interface ApiParametersQuery extends BaseApiParameters {
  star: string | null;
  public: string | null;
}
export interface ApiParametersReturn extends BaseApiParameters {
  star: boolean;
  public: boolean | null;
}

export const apiParameters = (
  apiParams: Partial<ApiParametersQuery>,
): ApiParametersReturn => {
  const limit = Number(apiParams.limit) || DEFAULT_API_RESPONSE_LIMIT;
  const offset = Number(apiParams.offset) || 0;
  const order = apiParams.order || DEFAULT_API_RESPONSE_ORDER;
  const status = apiParams.status || 'active';
  const star = apiParams.star === 'true' ? true : false;
  const publicItems = apiParams.public === 'true' ? true : false;
  const type = apiParams.type || null;
  const tag = apiParams.tag ? decodeURIComponent(apiParams.tag) : null;
  const top = apiParams.top || null;

  return {
    limit,
    offset,
    order: order as RequestOrder,
    status: status as Status,
    star,
    public: publicItems as boolean,
    type,
    tag,
    top,
  };
};
